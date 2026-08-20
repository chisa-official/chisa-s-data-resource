import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { AwardType } from '@prisma/client';

/** 分页参数解析：默认 page=1, pageSize=10 */
function parsePage(query: any): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** 我的奖助记录列表（可按 type 筛选，分页） */
export async function getAwardList(studentId: string, query: any) {
  const { page, pageSize, skip, take } = parsePage(query);
  const type = query.type as string | undefined;

  const where: any = { studentId };
  if (type) {
    if (!Object.values(AwardType).includes(type as AwardType)) {
      throw ApiError.badRequest('奖助类型不合法');
    }
    where.type = type;
  }

  const [list, total] = await Promise.all([
    prisma.award.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.award.count({ where }),
  ]);

  return { list, total, page, pageSize };
}

/** 我的申请列表及进度（即全部记录，分页） */
export async function getAwardApplies(studentId: string, query: any) {
  const { page, pageSize, skip, take } = parsePage(query);

  const [list, total] = await Promise.all([
    prisma.award.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
    prisma.award.count({ where: { studentId } }),
  ]);

  return { list, total, page, pageSize };
}

/** 创建奖助申请 */
export async function createAwardApply(
  studentId: string,
  data: { type: AwardType; name: string; amount?: number; semester: string; attachments?: string[] },
) {
  // 校验学生存在
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
  if (!student) throw ApiError.notFound('学生档案不存在');

  return prisma.award.create({
    data: {
      studentId,
      type: data.type,
      name: data.name,
      amount: data.amount,
      semester: data.semester,
      attachments: data.attachments ?? undefined,
      status: 'PENDING',
    },
  });
}
