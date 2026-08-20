import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { RepairType, FeedbackType } from '@prisma/client';

/** 分页参数解析 */
function parsePage(query: any): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

// ==================== 报修 ====================

/** 提交报修 */
export async function createRepair(
  studentId: string,
  data: {
    type: RepairType;
    location: string;
    description: string;
    images?: string[];
  },
) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  return prisma.repair.create({
    data: {
      studentId,
      type: data.type,
      location: data.location,
      description: data.description,
      images: data.images ?? undefined,
      status: 'PENDING',
    },
  });
}

/** 我的报修记录（分页） */
export async function getRepairList(studentId: string, query: any) {
  const { page, pageSize, skip, take } = parsePage(query);

  const [list, total] = await Promise.all([
    prisma.repair.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.repair.count({ where: { studentId } }),
  ]);

  return { list, total, page, pageSize };
}

// ==================== 反馈 ====================

/** 提交意见/投诉 */
export async function createFeedback(
  studentId: string,
  data: {
    type: FeedbackType;
    content: string;
  },
) {
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  return prisma.feedback.create({
    data: {
      studentId,
      type: data.type,
      content: data.content,
      status: 'PENDING',
    },
  });
}

/** 我的反馈及回复（分页） */
export async function getFeedbackList(studentId: string, query: any) {
  const { page, pageSize, skip, take } = parsePage(query);

  const [list, total] = await Promise.all([
    prisma.feedback.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.feedback.count({ where: { studentId } }),
  ]);

  return { list, total, page, pageSize };
}
