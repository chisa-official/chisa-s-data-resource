import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { storageProvider } from '../../shared/file/storage';
import { generateStorageKey } from '../../shared/file/upload';
import { StatusChangeType, StudentStatus, CertificateType } from '@prisma/client';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

/** 学籍异动类型 → 异动后状态映射（用于审批通过后回写 Student.status） */
export const TYPE_TO_AFTER_STATUS: Record<StatusChangeType, StudentStatus> = {
  SUSPEND: StudentStatus.SUSPENDED,
  RESUME: StudentStatus.NORMAL,
  TRANSFER_MAJOR: StudentStatus.NORMAL, // 转专业学籍状态不变
  DROP_OUT: StudentStatus.DROPPED,
};

/** 查询当前学籍状态 */
export async function getCurrentStatus(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      studentNo: true,
      name: true,
      gender: true,
      status: true,
      enrollDate: true,
      graduateDate: true,
      department: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
    },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');
  return student;
}

/** 查询可选专业列表（转专业用，排除指定院系） */
export async function getMajors(excludeDepartmentId?: string) {
  const where: any = {};
  if (excludeDepartmentId) {
    where.departmentId = { not: excludeDepartmentId };
  }
  return prisma.major.findMany({
    where,
    include: { department: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });
}

/** 查询学生可选专业列表（自动排除学生当前所在院系） */
export async function getMajorsForStudent(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { departmentId: true },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');
  return getMajors(student.departmentId);
}

/** 异动申请记录列表 */
export async function listStatusChanges(studentId: string, page: number, pageSize: number) {
  const [list, total] = await Promise.all([
    prisma.statusChange.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.statusChange.count({ where: { studentId } }),
  ]);
  return { list, total, page, pageSize };
}

/** 提交学籍异动申请 */
export async function applyStatusChange(
  studentId: string,
  type: StatusChangeType,
  reason: string,
  attachmentFile?: Express.Multer.File,
  targetMajorId?: string,
) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  // 状态前置校验
  if (type === StatusChangeType.SUSPEND && student.status !== StudentStatus.NORMAL) {
    throw ApiError.badRequest('仅在校状态可申请休学');
  }
  if (type === StatusChangeType.RESUME && student.status !== StudentStatus.SUSPENDED) {
    throw ApiError.badRequest('仅休学状态可申请复学');
  }
  if (type === StatusChangeType.TRANSFER_MAJOR && !targetMajorId) {
    throw ApiError.badRequest('转专业需指定目标专业');
  }

  // 上传附件（如有）
  let attachmentUrl: string | undefined;
  if (attachmentFile) {
    const key = generateStorageKey(attachmentFile.originalname, 'status_change');
    await storageProvider.upload(attachmentFile.buffer, key, attachmentFile.mimetype);
    attachmentUrl = storageProvider.getUrl(key);
  }

  const record = await prisma.statusChange.create({
    data: {
      studentId,
      type,
      reason: targetMajorId ? `${reason} [目标专业ID: ${targetMajorId}]` : reason,
      attachmentUrl,
      beforeStatus: student.status,
      status: 'PENDING',
      currentStep: 0,
    },
  });

  return record;
}

/** 证明申请记录列表 */
export async function listCertificates(studentId: string, page: number, pageSize: number) {
  const [list, total] = await Promise.all([
    prisma.certificateApply.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.certificateApply.count({ where: { studentId } }),
  ]);
  return { list, total, page, pageSize };
}

/** 申请在校/学籍证明，并生成 PDF */
export async function applyCertificate(
  studentId: string,
  type: CertificateType,
  purpose: string,
): Promise<{ id: string; fileUrl: string }> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      department: { select: { name: true } },
      class: { select: { name: true } },
    },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');

  // 生成 PDF
  const fileUrl = await generateCertificatePdf(student, type, purpose);

  const record = await prisma.certificateApply.create({
    data: {
      studentId,
      type,
      purpose,
      status: 'APPROVED', // 证明申请直接生成，无需审批
      fileUrl,
    },
  });

  return { id: record.id, fileUrl };
}

/** 下载证明 PDF：返回文件流 */
export async function downloadCertificate(studentId: string, certificateId: string): Promise<{ buffer: Buffer; filename: string }> {
  const record = await prisma.certificateApply.findUnique({ where: { id: certificateId } });
  if (!record) throw ApiError.notFound('证明记录不存在');
  if (record.studentId !== studentId) throw ApiError.forbidden('无权下载他人证明');
  if (!record.fileUrl) throw ApiError.notFound('证明文件未生成');

  // fileUrl 格式: /api/shared/files/local/certificates/xxx.pdf
  // 提取相对 key
  const key = record.fileUrl.replace(/^\/api\/shared\/files\/local\//, '');
  const buffer = await storageProvider.download(key);
  return { buffer, filename: `证明_${record.type}.pdf` };
}

/** 使用 pdfkit 生成在校/学籍证明 PDF，返回访问 URL */
async function generateCertificatePdf(
  student: any,
  type: CertificateType,
  purpose: string,
): Promise<string> {
  const key = `certificates/${student.studentNo}_${Date.now()}.pdf`;
  const buffers: Buffer[] = [];

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  const done = new Promise<void>((resolve) => doc.on('end', () => resolve()));

  const title = type === CertificateType.ENROLLMENT ? '在校证明' : '学籍证明';
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown(2);

  const statusText = student.status === 'NORMAL' ? '在校' : student.status;
  const content =
    `兹证明 ${student.name}（学号：${student.studentNo}），性别：${student.gender === 'MALE' ? '男' : '女'}，` +
    `系我校 ${student.department?.name || ''} ${student.class?.name || ''} 班学生，` +
    `学籍状态：${statusText}。` +
    (student.enrollDate ? `入学日期：${student.enrollDate.toISOString().slice(0, 10)}。` : '') +
    `\n\n用途：${purpose}\n\n` +
    `特此证明。`;

  doc.fontSize(14).text(content, { lineGap: 8 });
  doc.moveDown(4);

  const today = new Date().toISOString().slice(0, 10);
  doc.text(`颁发日期：${today}`, { align: 'right' });
  doc.text(`（盖章处）`, { align: 'right' });

  doc.end();

  // 等待 PDF 生成完成
  await done;
  const buffer = Buffer.concat(buffers);

  await storageProvider.upload(buffer, key, 'application/pdf');
  return storageProvider.getUrl(key);
}
