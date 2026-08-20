import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { storageProvider } from '../../shared/file/storage';
import PDFDocument from 'pdfkit';
import {
  StatusChangeType,
  StudentStatus,
  CertificateType,
  ApplyStatus,
} from '@prisma/client';

// 异动类型 → 异动后状态映射
const TYPE_TO_AFTER_STATUS: Record<StatusChangeType, StudentStatus> = {
  SUSPEND: StudentStatus.SUSPENDED,
  RESUME: StudentStatus.NORMAL,
  TRANSFER_MAJOR: StudentStatus.NORMAL,
  DROP_OUT: StudentStatus.DROPPED,
};

// ========== 学籍异动审批 ==========

export interface StatusChangeListParams {
  page: number;
  pageSize: number;
  status?: ApplyStatus;
  type?: StatusChangeType;
  studentNo?: string;
  studentName?: string;
}

export async function listStatusChanges(params: StatusChangeListParams) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.statusChange.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            department: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.statusChange.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

export async function approveStatusChange(id: string, reviewerId: string) {
  const change = await prisma.statusChange.findUnique({ where: { id } });
  if (!change) throw ApiError.notFound('异动申请不存在');
  if (change.status !== ApplyStatus.PENDING) {
    throw ApiError.badRequest('该申请已处理');
  }

  const afterStatus = TYPE_TO_AFTER_STATUS[change.type];

  // 事务：更新异动记录 + 回写学生状态
  return prisma.$transaction(async (tx) => {
    const updated = await tx.statusChange.update({
      where: { id },
      data: {
        status: ApplyStatus.APPROVED,
        afterStatus,
        reviewerId,
        reviewedAt: new Date(),
      },
    });

    // 转专业：解析目标专业 ID 并切换学生所属
    if (change.type === StatusChangeType.TRANSFER_MAJOR) {
      const match = change.reason.match(/\[目标专业ID: ([^\]]+)\]/);
      if (match) {
        const targetMajorId = match[1];
        const major = await tx.major.findUnique({ where: { id: targetMajorId } });
        if (major) {
          // 找该专业下学生当前年级对应的班级，若无则只更新院系
          const student = await tx.student.findUnique({
            where: { id: change.studentId },
            include: { class: { select: { grade: true } } },
          });
          if (student) {
            const targetClass = await tx.class.findFirst({
              where: { majorId: targetMajorId, grade: student.class?.grade || 2024 },
            });
            await tx.student.update({
              where: { id: change.studentId },
              data: {
                status: afterStatus,
                departmentId: major.departmentId,
                ...(targetClass ? { classId: targetClass.id } : {}),
              },
            });
          }
        }
      }
    } else {
      await tx.student.update({
        where: { id: change.studentId },
        data: { status: afterStatus },
      });
    }

    return updated;
  });
}

export async function rejectStatusChange(id: string, reviewerId: string, reason?: string) {
  const change = await prisma.statusChange.findUnique({ where: { id } });
  if (!change) throw ApiError.notFound('异动申请不存在');
  if (change.status !== ApplyStatus.PENDING) {
    throw ApiError.badRequest('该申请已处理');
  }

  return prisma.statusChange.update({
    where: { id },
    data: {
      status: ApplyStatus.REJECTED,
      reviewerId,
      reviewedAt: new Date(),
    },
  });
}

// ========== 信息修改审批 ==========

export interface InfoEditListParams {
  page: number;
  pageSize: number;
  status?: ApplyStatus;
  studentNo?: string;
  studentName?: string;
}

export async function listInfoEdits(params: InfoEditListParams) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.infoEditApply.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            department: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.infoEditApply.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

const EDITABLE_FIELDS = new Set([
  'phone',
  'email',
  'hometown',
  'address',
  'photoUrl',
]);

export async function approveInfoEdit(id: string, reviewerId: string) {
  const apply = await prisma.infoEditApply.findUnique({ where: { id } });
  if (!apply) throw ApiError.notFound('信息修改申请不存在');
  if (apply.status !== ApplyStatus.PENDING) {
    throw ApiError.badRequest('该申请已处理');
  }
  if (!EDITABLE_FIELDS.has(apply.field)) {
    throw ApiError.badRequest(`字段「${apply.field}」不允许修改`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.infoEditApply.update({
      where: { id },
      data: {
        status: ApplyStatus.APPROVED,
        reviewerId,
        reviewedAt: new Date(),
      },
    });

    // 将 newValue 写回学生对应字段
    await tx.student.update({
      where: { id: apply.studentId },
      data: { [apply.field]: apply.newValue || null } as any,
    });

    return updated;
  });
}

export async function rejectInfoEdit(id: string, reviewerId: string) {
  const apply = await prisma.infoEditApply.findUnique({ where: { id } });
  if (!apply) throw ApiError.notFound('信息修改申请不存在');
  if (apply.status !== ApplyStatus.PENDING) {
    throw ApiError.badRequest('该申请已处理');
  }

  return prisma.infoEditApply.update({
    where: { id },
    data: {
      status: ApplyStatus.REJECTED,
      reviewerId,
      reviewedAt: new Date(),
    },
  });
}

// ========== 证明申请 ==========

export interface CertificateListParams {
  page: number;
  pageSize: number;
  status?: ApplyStatus;
  type?: CertificateType;
  studentNo?: string;
  studentName?: string;
}

export async function listCertificates(params: CertificateListParams) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.type) where.type = params.type;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.certificateApply.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            department: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.certificateApply.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

/** 管理员手动生成 / 重新生成证明 PDF */
export async function generateCertificatePdf(id: string) {
  const apply = await prisma.certificateApply.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          department: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
    },
  });
  if (!apply) throw ApiError.notFound('证明申请不存在');

  const fileUrl = await renderPdf(apply.student, apply.type, apply.purpose);
  return prisma.certificateApply.update({
    where: { id },
    data: {
      fileUrl,
      status: ApplyStatus.APPROVED,
    },
  });
}

async function renderPdf(student: any, type: CertificateType, purpose: string): Promise<string> {
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
    `\n\n用途：${purpose}\n\n特此证明。`;
  doc.fontSize(14).text(content, { lineGap: 8 });
  doc.moveDown(4);
  doc.text(`颁发日期：${new Date().toISOString().slice(0, 10)}`, { align: 'right' });
  doc.text(`（盖章处）`, { align: 'right' });
  doc.end();

  await done;
  const buffer = Buffer.concat(buffers);
  await storageProvider.upload(buffer, key, 'application/pdf');
  return storageProvider.getUrl(key);
}

// ========== 毕业审核 ==========

export interface GraduationAuditParams {
  page: number;
  pageSize: number;
  departmentId?: string;
  classId?: string;
  studentNo?: string;
  name?: string;
}

/** 毕业资格审核列表：仅返回在校学生，附带学分/绩点统计 */
export async function graduationAuditList(params: GraduationAuditParams) {
  const where: any = { status: StudentStatus.NORMAL };
  if (params.departmentId) where.departmentId = params.departmentId;
  if (params.classId) where.classId = params.classId;
  if (params.studentNo) where.studentNo = { contains: params.studentNo };
  if (params.name) where.name = { contains: params.name };

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        department: { select: { name: true } },
        class: { select: { name: true, major: { select: { name: true, duration: true } } } },
        scores: { select: { finalScore: true, gpaPoint: true, course: { select: { credit: true, type: true } } } },
      },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { studentNo: 'asc' },
    }),
    prisma.student.count({ where }),
  ]);

  const list = students.map((s) => {
    const passedScores = s.scores.filter((sc) => sc.finalScore >= 60);
    const totalCredits = passedScores.reduce((sum, sc) => sum + sc.course.credit, 0);
    const totalPoints = passedScores.reduce((sum, sc) => sum + sc.course.credit * sc.gpaPoint, 0);
    const gpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0;
    const requiredCredits = passedScores
      .filter((sc) => sc.course.type === 'REQUIRED')
      .reduce((sum, sc) => sum + sc.course.credit, 0);
    const expectedDuration = s.class?.major?.duration || 4;
    const enrollYear = s.enrollDate ? new Date(s.enrollDate).getFullYear() : 0;
    const currentYear = new Date().getFullYear();
    const yearsStudied = currentYear - enrollYear;

    // 毕业资格判定：修满 expectedDuration*30 学分且必修课全部通过（简化规则）
    const requiredTotalCredits = expectedDuration * 30;
    const qualified = totalCredits >= requiredTotalCredits && yearsStudied >= expectedDuration;

    return {
      id: s.id,
      studentNo: s.studentNo,
      name: s.name,
      departmentName: s.department?.name || '',
      className: s.class?.name || '',
      majorName: s.class?.major?.name || '',
      expectedDuration,
      yearsStudied,
      totalCredits,
      requiredCredits,
      requiredTotalCredits,
      gpa,
      qualified,
      enrollDate: s.enrollDate,
    };
  });

  return { list, total, page: params.page, pageSize: params.pageSize };
}

/** 登记毕业状态：毕业/结业/肄业 */
export async function registerGraduation(studentId: string, result: 'GRADUATED' | 'COMPLETED' | 'LEFT') {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const statusMap: Record<string, StudentStatus> = {
    GRADUATED: StudentStatus.GRADUATED,
    // 结业 / 肄业 在 StudentStatus 中无独立值，统一归为 GRADUATED 但记录结果
    COMPLETED: StudentStatus.GRADUATED,
    LEFT: StudentStatus.DROPPED,
  };

  return prisma.student.update({
    where: { id: studentId },
    data: {
      status: statusMap[result],
      graduateDate: new Date(),
    },
  });
}

/** 批量毕业登记 */
export async function batchRegisterGraduation(studentIds: string[], result: 'GRADUATED' | 'COMPLETED' | 'LEFT') {
  const statusMap: Record<string, StudentStatus> = {
    GRADUATED: StudentStatus.GRADUATED,
    COMPLETED: StudentStatus.GRADUATED,
    LEFT: StudentStatus.DROPPED,
  };
  const result2 = await prisma.student.updateMany({
    where: { id: { in: studentIds } },
    data: { status: statusMap[result], graduateDate: new Date() },
  });
  return { count: result2.count };
}
