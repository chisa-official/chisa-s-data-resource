import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { NoticeScope } from '@prisma/client';

// ========== 通知 CRUD ==========

export interface NoticeListParams {
  page: number;
  pageSize: number;
  title?: string;
  scope?: NoticeScope;
  published?: boolean;
}

export async function listNotices(params: NoticeListParams) {
  const where: any = {};
  if (params.title) where.title = { contains: params.title };
  if (params.scope) where.scope = params.scope;
  if (params.published !== undefined) where.published = params.published;

  const [list, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.notice.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

export async function getNotice(id: string) {
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw ApiError.notFound('通知不存在');
  return notice;
}

export async function createNotice(data: {
  title: string;
  content: string;
  scope: NoticeScope;
  targetId?: string;
  attachments?: string[];
  publishAt?: string;
}, publisherId: string) {
  if (data.scope !== NoticeScope.SCHOOL && !data.targetId) {
    throw ApiError.badRequest('院系/班级范围通知必须指定目标 ID');
  }

  const publishAt = data.publishAt ? new Date(data.publishAt) : new Date();
  if (isNaN(publishAt.getTime())) throw ApiError.badRequest('发布时间格式错误');

  return prisma.notice.create({
    data: {
      title: data.title,
      content: data.content,
      scope: data.scope,
      targetId: data.scope === NoticeScope.SCHOOL ? null : data.targetId,
      attachments: data.attachments ?? undefined,
      publishAt,
      published: false,
      publisherId,
    },
  });
}

export async function updateNotice(id: string, data: {
  title?: string;
  content?: string;
  scope?: NoticeScope;
  targetId?: string;
  attachments?: string[];
  publishAt?: string;
}) {
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('通知不存在');
  if (existing.published) throw ApiError.badRequest('已发布的通知不可编辑');

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.scope !== undefined) {
    updateData.scope = data.scope;
    if (data.scope === NoticeScope.SCHOOL) {
      updateData.targetId = null;
    } else if (data.targetId !== undefined) {
      updateData.targetId = data.targetId;
    } else if (!existing.targetId) {
      throw ApiError.badRequest('院系/班级范围通知必须指定目标 ID');
    }
  } else if (data.targetId !== undefined && existing.scope !== NoticeScope.SCHOOL) {
    updateData.targetId = data.targetId;
  }
  if (data.attachments !== undefined) updateData.attachments = data.attachments;
  if (data.publishAt !== undefined) {
    const publishAt = new Date(data.publishAt);
    if (isNaN(publishAt.getTime())) throw ApiError.badRequest('发布时间格式错误');
    updateData.publishAt = publishAt;
  }

  return prisma.notice.update({ where: { id }, data: updateData });
}

export async function deleteNotice(id: string): Promise<void> {
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('通知不存在');
  await prisma.notice.delete({ where: { id } });
}

/** 发布通知：published=true。若 publishAt 在未来则由学生端按 publishAt<=now 控制可见性（定时发布） */
export async function publishNotice(id: string) {
  const existing = await prisma.notice.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('通知不存在');
  if (existing.published) throw ApiError.badRequest('该通知已发布');

  return prisma.notice.update({
    where: { id },
    data: { published: true },
  });
}

// ========== 阅读统计 ==========

/** 按 scope 计算应读人数与已读人数 */
export async function getReadStats(id: string) {
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw ApiError.notFound('通知不存在');

  // 计算应读人数
  let totalShouldRead = 0;
  if (notice.scope === NoticeScope.SCHOOL) {
    totalShouldRead = await prisma.student.count();
  } else if (notice.scope === NoticeScope.DEPARTMENT) {
    totalShouldRead = await prisma.student.count({ where: { departmentId: notice.targetId! } });
  } else if (notice.scope === NoticeScope.CLASS) {
    totalShouldRead = await prisma.student.count({ where: { classId: notice.targetId! } });
  }

  const readCount = await prisma.noticeRead.count({ where: { noticeId: id } });

  return {
    noticeId: id,
    title: notice.title,
    scope: notice.scope,
    published: notice.published,
    publishAt: notice.publishAt,
    totalShouldRead,
    readCount,
    unreadCount: Math.max(0, totalShouldRead - readCount),
    readRate: totalShouldRead === 0 ? 0 : Math.round((readCount / totalShouldRead) * 10000) / 100,
  };
}

/** 已读学生列表（分页） */
export async function getReaders(id: string, params: { page: number; pageSize: number; read?: boolean }) {
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw ApiError.notFound('通知不存在');

  // 应读学生 ID 集合
  let shouldReadWhere: any = {};
  if (notice.scope === NoticeScope.DEPARTMENT) shouldReadWhere = { departmentId: notice.targetId! };
  else if (notice.scope === NoticeScope.CLASS) shouldReadWhere = { classId: notice.targetId! };

  const readFilter = params.read === false ? false : params.read === true ? true : undefined;

  if (readFilter === true) {
    // 仅已读
    const [list, total] = await Promise.all([
      prisma.noticeRead.findMany({
        where: { noticeId: id },
        include: { student: { select: { id: true, studentNo: true, name: true, department: { select: { name: true } }, class: { select: { name: true } } } } },
        orderBy: { readAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.noticeRead.count({ where: { noticeId: id } }),
    ]);
    return {
      list: list.map((r) => ({ ...r.student, isRead: true, readAt: r.readAt })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  // 默认：应读学生全集 + isRead 标记（read=false 时仅筛未读）
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where: shouldReadWhere,
      select: { id: true, studentNo: true, name: true, department: { select: { name: true } }, class: { select: { name: true } } },
      orderBy: { studentNo: 'asc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.student.count({ where: shouldReadWhere }),
  ]);

  const readRecords = await prisma.noticeRead.findMany({
    where: { noticeId: id, studentId: { in: students.map((s) => s.id) } },
    select: { studentId: true, readAt: true },
  });
  const readMap = new Map(readRecords.map((r) => [r.studentId, r.readAt]));

  let resultList = students.map((s) => ({
    ...s,
    isRead: readMap.has(s.id),
    readAt: readMap.get(s.id) || null,
  }));
  if (readFilter === false) {
    resultList = resultList.filter((s) => !s.isRead);
  }

  return { list: resultList, total: readFilter === false ? resultList.length : total, page: params.page, pageSize: params.pageSize };
}
