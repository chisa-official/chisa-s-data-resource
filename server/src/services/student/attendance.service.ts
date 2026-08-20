import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';

/** 分页参数解析：默认 page=1, pageSize=10 */
function parsePage(query: any): { page: number; pageSize: number; skip: number; take: number } {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize as string, 10) || 10));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** 考勤记录列表（按日期范围筛选，分页，手动关联 course 信息） */
export async function getAttendanceRecords(studentId: string, query: any) {
  const { page, pageSize, skip, take } = parsePage(query);

  const where: any = { studentId };
  const startDateStr = query.startDate as string | undefined;
  const endDateStr = query.endDate as string | undefined;

  if (startDateStr || endDateStr) {
    where.date = {};
    if (startDateStr) {
      const start = new Date(startDateStr);
      if (isNaN(start.getTime())) throw ApiError.badRequest('startDate 格式错误');
      where.date.gte = start;
    }
    if (endDateStr) {
      const end = new Date(endDateStr);
      if (isNaN(end.getTime())) throw ApiError.badRequest('endDate 格式错误');
      where.date.lte = end;
    }
  }

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  // schema 中 AttendanceRecord 仅有 courseId，无 course 关系，手动关联课程信息
  const courseIds = [...new Set(records.map((r) => r.courseId))];
  const courses = courseIds.length
    ? await prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, name: true, code: true },
      })
    : [];
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  const list = records.map((r) => ({
    ...r,
    course: courseMap.get(r.courseId) || null,
  }));

  return { list, total, page, pageSize };
}

/** 缺勤统计（按日期范围） */
export async function getAttendanceStatistics(studentId: string, query: any) {
  const where: any = { studentId };
  const startDateStr = query.startDate as string | undefined;
  const endDateStr = query.endDate as string | undefined;

  if (startDateStr || endDateStr) {
    where.date = {};
    if (startDateStr) {
      const start = new Date(startDateStr);
      if (isNaN(start.getTime())) throw ApiError.badRequest('startDate 格式错误');
      where.date.gte = start;
    }
    if (endDateStr) {
      const end = new Date(endDateStr);
      if (isNaN(end.getTime())) throw ApiError.badRequest('endDate 格式错误');
      where.date.lte = end;
    }
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    select: { status: true },
  });

  const total = records.length;
  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;
  for (const r of records) {
    if (r.status === 'PRESENT') present++;
    else if (r.status === 'ABSENT') absent++;
    else if (r.status === 'LATE') late++;
    else if (r.status === 'LEAVE') leave++;
  }

  const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;

  return { total, present, absent, late, leave, rate };
}
