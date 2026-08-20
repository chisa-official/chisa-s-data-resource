import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { hashPassword, comparePassword } from '../../shared/utils/crypto';
import { storageProvider } from '../../shared/file/storage';
import { generateStorageKey } from '../../shared/file/upload';
import { UserType } from '@prisma/client';

/** 敏感字段：变更需走审批 */
const SENSITIVE_FIELDS = ['phone', 'email', 'hometown', 'address'];

/** 非敏感字段：可直接更新 */
const NON_SENSITIVE_FIELDS = ['photoUrl'];

/** 获取学生档案 */
export async function getProfile(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      department: { select: { id: true, name: true, code: true } },
      class: { select: { id: true, name: true } },
    },
  });
  if (!student) throw ApiError.notFound('学生档案不存在');
  return {
    id: student.id,
    studentNo: student.studentNo,
    name: student.name,
    gender: student.gender,
    photoUrl: student.photoUrl,
    departmentId: student.departmentId,
    department: student.department,
    classId: student.classId,
    class: student.class,
    phone: student.phone,
    email: student.email,
    hometown: student.hometown,
    address: student.address,
    status: student.status,
    familyMembers: student.familyMembers,
    enrollDate: student.enrollDate ? student.enrollDate.toISOString() : null,
    graduateDate: student.graduateDate ? student.graduateDate.toISOString() : null,
    createdAt: student.createdAt.toISOString(),
  };
}

/** 提交信息修改申请（敏感字段走审批） */
export async function submitInfoEdit(
  studentId: string,
  field: string,
  newValue: string,
): Promise<{ id: string; status: string }> {
  if (!SENSITIVE_FIELDS.includes(field) && !NON_SENSITIVE_FIELDS.includes(field)) {
    throw ApiError.badRequest(`不允许修改该字段: ${field}`);
  }

  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const oldValue = (student as any)[field] ?? null;

  // 非敏感字段直接更新
  if (NON_SENSITIVE_FIELDS.includes(field)) {
    await prisma.student.update({
      where: { id: studentId },
      data: { [field]: newValue } as any,
    });
    return { id: 'direct-update', status: 'APPROVED' };
  }

  // 敏感字段创建审批记录
  const record = await prisma.infoEditApply.create({
    data: {
      studentId,
      field,
      oldValue: String(oldValue ?? ''),
      newValue,
      status: 'PENDING',
    },
  });
  return { id: record.id, status: record.status };
}

/** 查询我的信息修改申请记录 */
export async function listInfoEdits(studentId: string, page: number, pageSize: number) {
  const [list, total] = await Promise.all([
    prisma.infoEditApply.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.infoEditApply.count({ where: { studentId } }),
  ]);
  return { list, total, page, pageSize };
}

/** 修改密码（需校验原密码） */
export async function changePassword(studentId: string, oldPassword: string, newPassword: string): Promise<void> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const ok = await comparePassword(oldPassword, student.password);
  if (!ok) throw ApiError.badRequest('原密码错误');

  const hashed = await hashPassword(newPassword);
  await prisma.student.update({
    where: { id: studentId },
    data: { password: hashed },
  });
}

/** 上传头像 */
export async function uploadAvatar(studentId: string, file: Express.Multer.File): Promise<string> {
  if (!file) throw ApiError.badRequest('未上传文件');
  const key = generateStorageKey(file.originalname, 'avatar');
  await storageProvider.upload(file.buffer, key, file.mimetype);

  const url = storageProvider.getUrl(key);
  await prisma.student.update({
    where: { id: studentId },
    data: { photoUrl: url },
  });

  // 记录文件（可选，便于审计）
  await prisma.fileRecord.create({
    data: {
      filename: file.originalname,
      storedName: key.split('/').pop()!,
      mimeType: file.mimetype,
      size: file.size,
      path: key,
      storage: 'LOCAL',
      uploaderId: studentId,
      uploaderType: UserType.STUDENT,
      bizType: 'avatar',
    },
  });

  return url;
}
