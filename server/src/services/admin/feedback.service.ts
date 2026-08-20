import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { FeedbackType, ApplyStatus } from '@prisma/client';

// ========== 反馈管理（建议/投诉） ==========

export interface FeedbackListParams {
  page: number;
  pageSize: number;
  type?: FeedbackType;
  status?: ApplyStatus;
  studentNo?: string;
  studentName?: string;
}

export async function listFeedbacks(params: FeedbackListParams) {
  const where: any = {};
  if (params.type) where.type = params.type;
  if (params.status) where.status = params.status;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.feedback.findMany({
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
    prisma.feedback.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

export async function getFeedback(id: string) {
  const feedback = await prisma.feedback.findUnique({
    where: { id },
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
  });
  if (!feedback) throw ApiError.notFound('反馈不存在');
  return feedback;
}

/** 回复反馈：填写 reply，状态置为已处理（APPROVED） */
export async function replyFeedback(id: string, data: { reply: string }) {
  const existing = await prisma.feedback.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('反馈不存在');
  if (!data.reply || !data.reply.trim()) throw ApiError.badRequest('回复内容不能为空');

  return prisma.feedback.update({
    where: { id },
    data: {
      reply: data.reply,
      status: ApplyStatus.APPROVED,
    },
  });
}
