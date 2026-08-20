import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { SelectionStatus } from '@prisma/client';

// ========== 选课时间段控制 ==========

export interface SelectionPeriodParams {
  courseId?: string;
  semester?: string;
}

export async function getSelectionPeriods(params: SelectionPeriodParams) {
  const where: any = {};
  if (params.courseId) where.id = params.courseId;
  if (params.semester) {
    // 通过 CourseSelection 反查有该学期选课记录的课程
    where.selections = { some: { semester: params.semester } };
  }

  const courses = await prisma.course.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      capacity: true,
      selectStart: true,
      selectEnd: true,
      teacher: { select: { id: true, name: true } },
      _count: {
        select: {
          selections: params.semester
            ? { where: { semester: params.semester, status: SelectionStatus.SELECTED } }
            : { where: { status: SelectionStatus.SELECTED } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return courses.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    capacity: c.capacity,
    selectStart: c.selectStart,
    selectEnd: c.selectEnd,
    teacher: c.teacher,
    selectedCount: c._count.selections,
    remaining: c.capacity - c._count.selections,
    isOpen: !c.selectStart || !c.selectEnd || (new Date() >= c.selectStart && new Date() <= c.selectEnd),
  }));
}

export async function updateSelectionPeriod(
  courseId: string,
  data: { selectStart?: string | null; selectEnd?: string | null },
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw ApiError.notFound('课程不存在');

  const updateData: any = {};
  if (data.selectStart !== undefined) {
    updateData.selectStart = data.selectStart ? new Date(data.selectStart) : null;
  }
  if (data.selectEnd !== undefined) {
    updateData.selectEnd = data.selectEnd ? new Date(data.selectEnd) : null;
  }

  return prisma.course.update({ where: { id: courseId }, data: updateData });
}

/** 一键开放/关闭选课 */
export async function toggleSelection(
  courseId: string,
  action: 'OPEN' | 'CLOSE',
  days?: number,
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw ApiError.notFound('课程不存在');

  const now = new Date();
  if (action === 'OPEN') {
    const end = days ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return prisma.course.update({
      where: { id: courseId },
      data: { selectStart: now, selectEnd: end },
    });
  } else {
    return prisma.course.update({
      where: { id: courseId },
      data: { selectStart: null, selectEnd: null },
    });
  }
}

// ========== 选课情况查询 ==========

export interface SelectionListParams {
  page: number;
  pageSize: number;
  courseId?: string;
  studentNo?: string;
  studentName?: string;
  semester?: string;
  status?: SelectionStatus;
}

export async function listSelections(params: SelectionListParams) {
  const where: any = {};
  if (params.courseId) where.courseId = params.courseId;
  if (params.semester) where.semester = params.semester;
  if (params.status) where.status = params.status;
  if (params.studentNo || params.studentName) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
  }

  const [list, total] = await Promise.all([
    prisma.courseSelection.findMany({
      where,
      include: {
        student: { select: { id: true, studentNo: true, name: true, class: { select: { name: true } } } },
        course: { select: { id: true, code: true, name: true, credit: true, type: true, teacher: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.courseSelection.count({ where }),
  ]);

  return { list, total, page: params.page, pageSize: params.pageSize };
}

/** 选课统计：按课程分组 */
export async function selectionStatistics(semester?: string) {
  const where: any = {};
  if (semester) where.semester = semester;

  const courses = await prisma.course.findMany({
    where: { selections: { some: { semester: semester || undefined } } },
    select: {
      id: true,
      code: true,
      name: true,
      capacity: true,
      type: true,
      teacher: { select: { name: true } },
      _count: {
        select: {
          selections: semester
            ? { where: { semester, status: SelectionStatus.SELECTED } }
            : { where: { status: SelectionStatus.SELECTED } },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return courses.map((c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    type: c.type,
    capacity: c.capacity,
    teacherName: c.teacher?.name,
    selectedCount: c._count.selections,
    fillRate: c.capacity > 0 ? Number(((c._count.selections / c.capacity) * 100).toFixed(1)) : 0,
  }));
}

/** 管理员强制退选 */
export async function forceDropSelection(selectionId: string) {
  const selection = await prisma.courseSelection.findUnique({ where: { id: selectionId } });
  if (!selection) throw ApiError.notFound('选课记录不存在');
  if (selection.status !== SelectionStatus.SELECTED) {
    throw ApiError.badRequest('该选课记录状态不允许退选');
  }
  return prisma.courseSelection.update({
    where: { id: selectionId },
    data: { status: SelectionStatus.DROPPED },
  });
}
