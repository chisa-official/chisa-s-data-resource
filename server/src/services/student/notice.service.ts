import { prisma } from '../../shared/utils/prisma';
import { NoticeScope } from '@prisma/client';

/** 分页参数解析 */
function parsePage(query: any): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** 构建学生可见通知的 where 条件 */
async function buildVisibleWhere(studentId: string, scope?: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { departmentId: true, classId: true },
  });
  if (!student) return null;

  const now = new Date();

  const where: any = {
    published: true,
    publishAt: { lte: now },
    OR: [
      { scope: NoticeScope.SCHOOL },
      { scope: NoticeScope.DEPARTMENT, targetId: student.departmentId },
      { scope: NoticeScope.CLASS, targetId: student.classId },
    ],
  };

  if (scope && Object.values(NoticeScope).includes(scope as NoticeScope)) {
    where.scope = scope as NoticeScope;
  }

  return where;
}

/** 通知列表（按可见范围过滤，分页，带 isRead 标记） */
export async function getNoticeList(studentId: string, query: any) {
  const { page, pageSize, skip, take } = parsePage(query);
  const scope = query.scope as string | undefined;

  const where = await buildVisibleWhere(studentId, scope);
  if (!where) return { list: [], total: 0, page, pageSize };

  const [notices, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      orderBy: { publishAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        title: true,
        scope: true,
        publishAt: true,
        createdAt: true,
      },
    }),
    prisma.notice.count({ where }),
  ]);

  // 查询已读记录
  const readRecords = await prisma.noticeRead.findMany({
    where: { studentId, noticeId: { in: notices.map((n) => n.id) } },
    select: { noticeId: true },
  });
  const readSet = new Set(readRecords.map((r) => r.noticeId));

  const list = notices.map((n) => ({
    ...n,
    isRead: readSet.has(n.id),
  }));

  return { list, total, page, pageSize };
}

/** 通知详情（自动标记已读） */
export async function getNoticeDetail(studentId: string, noticeId: string) {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
  });
  if (!notice) return null;

  // 校验可见性
  const where = await buildVisibleWhere(studentId);
  if (!where) return null;

  const visible = await prisma.notice.count({ where: { ...where, id: noticeId } });
  if (visible === 0) return null;

  // upsert 已读记录
  await prisma.noticeRead.upsert({
    where: {
      noticeId_studentId: { noticeId, studentId },
    },
    update: { readAt: new Date() },
    create: { noticeId, studentId },
  });

  return notice;
}

/** 未读通知数 */
export async function getUnreadCount(studentId: string) {
  const where = await buildVisibleWhere(studentId);
  if (!where) return { count: 0 };

  const visibleNotices = await prisma.notice.findMany({
    where,
    select: { id: true },
  });
  const visibleIds = visibleNotices.map((n) => n.id);

  if (visibleIds.length === 0) return { count: 0 };

  const readCount = await prisma.noticeRead.count({
    where: { studentId, noticeId: { in: visibleIds } },
  });

  return { count: visibleIds.length - readCount };
}

/** 标记已读 */
export async function markAsRead(studentId: string, noticeId: string) {
  // 校验通知存在且可见
  const where = await buildVisibleWhere(studentId);
  if (!where) return;

  const visible = await prisma.notice.count({ where: { ...where, id: noticeId } });
  if (visible === 0) return;

  await prisma.noticeRead.upsert({
    where: {
      noticeId_studentId: { noticeId, studentId },
    },
    update: { readAt: new Date() },
    create: { noticeId, studentId },
  });
}
