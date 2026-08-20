import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { LeaveType } from '@prisma/client';

/** 分页参数解析：默认 page=1, pageSize=10 */
function parsePage(query: any): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** 提交请假申请 */
export async function createLeaveApply(
  studentId: string,
  data: {
    type: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    attachmentUrl?: string;
  },
) {
  // 校验学生存在
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (isNaN(startDate.getTime())) throw ApiError.badRequest('开始时间格式错误');
  if (isNaN(endDate.getTime())) throw ApiError.badRequest('结束时间格式错误');
  if (endDate <= startDate) throw ApiError.badRequest('结束时间必须晚于开始时间');

  return prisma.leaveApply.create({
    data: {
      studentId,
      type: data.type,
      startDate,
      endDate,
      reason: data.reason,
      attachmentUrl: data.attachmentUrl ?? undefined,
      status: 'PENDING',
      currentStep: 0,
    },
  });
}

/** 请假记录及审批状态（分页） */
export async function getLeaveList(studentId: string, query: any) {
  const { page, pageSize, skip, take } = parsePage(query);

  const [list, total] = await Promise.all([
    prisma.leaveApply.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.leaveApply.count({ where: { studentId } }),
  ]);

  return { list, total, page, pageSize };
}
