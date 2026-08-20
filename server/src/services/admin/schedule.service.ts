import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';

// ========== 排课管理 ==========

export interface ScheduleListParams {
  page?: number;
  pageSize?: number;
  courseId?: string;
  classId?: string;
  classroom?: string;
  weekDay?: number;
}

export async function listSchedules(params: ScheduleListParams) {
  const where: any = {};
  if (params.courseId) where.courseId = params.courseId;
  if (params.classId) where.classId = params.classId;
  if (params.classroom) where.classroom = { contains: params.classroom };
  if (params.weekDay) where.weekDay = params.weekDay;

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  const [list, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      include: {
        course: {
          select: { id: true, code: true, name: true, credit: true, teacher: { select: { id: true, name: true } } },
        },
      },
      orderBy: [{ weekDay: 'asc' }, { startSection: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.schedule.count({ where }),
  ]);

  // 单独查询班级名映射（Schedule 无 class 关系，仅有 classId）
  const classIds = Array.from(new Set(list.map((s) => s.classId)));
  const classes = classIds.length > 0 ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } }) : [];
  const classMap = new Map(classes.map((c) => [c.id, c.name]));

  return {
    list: list.map((s) => ({ ...s, className: classMap.get(s.classId) || '' })),
    total,
    page,
    pageSize,
  };
}

/** 不分页查询全部课表（用于课表展示） */
export async function listAllSchedules(params: Omit<ScheduleListParams, 'page' | 'pageSize'>) {
  const where: any = {};
  if (params.courseId) where.courseId = params.courseId;
  if (params.classId) where.classId = params.classId;
  if (params.classroom) where.classroom = { contains: params.classroom };
  if (params.weekDay) where.weekDay = params.weekDay;

  const list = await prisma.schedule.findMany({
    where,
    include: {
      course: {
        select: { id: true, code: true, name: true, credit: true, teacher: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ weekDay: 'asc' }, { startSection: 'asc' }],
  });

  const classIds = Array.from(new Set(list.map((s) => s.classId)));
  const classes = classIds.length > 0 ? await prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } }) : [];
  const classMap = new Map(classes.map((c) => [c.id, c.name]));

  return list.map((s) => ({ ...s, className: classMap.get(s.classId) || '' }));
}

export interface CreateScheduleData {
  courseId: string;
  classId: string;
  weekDay: number;
  startSection: number;
  endSection: number;
  startWeek: number;
  endWeek: number;
  classroom: string;
}

/** 排课冲突检测：教师 / 班级 / 教室 在同一时间段（周次重叠+节次重叠+星期相同）不能重复 */
async function detectConflicts(data: CreateScheduleData, excludeId?: string): Promise<string[]> {
  const conflicts: string[] = [];

  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
    include: { teacher: { select: { name: true } } },
  });
  if (!course) {
    conflicts.push('课程不存在');
    return conflicts;
  }

  // 同课程 + 同班级 已有排课（避免重复）
  const sameCourseClass = await prisma.schedule.findFirst({
    where: {
      courseId: data.courseId,
      classId: data.classId,
      weekDay: data.weekDay,
      startSection: data.startSection,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
  if (sameCourseClass) conflicts.push('该课程在此班级的同一节次已有排课');

  // 教室冲突
  const roomConflict = await prisma.schedule.findFirst({
    where: {
      classroom: data.classroom,
      weekDay: data.weekDay,
      startSection: { lte: data.endSection },
      endSection: { gte: data.startSection },
      // 周次重叠
      startWeek: { lte: data.endWeek },
      endWeek: { gte: data.startWeek },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    include: { course: { select: { name: true } } },
  });
  if (roomConflict) {
    conflicts.push(`教室「${data.classroom}」此时段已被「${roomConflict.course.name}」占用`);
  }

  // 教师冲突
  const teacherConflict = await prisma.schedule.findFirst({
    where: {
      course: { teacherId: course.teacherId },
      weekDay: data.weekDay,
      startSection: { lte: data.endSection },
      endSection: { gte: data.startSection },
      startWeek: { lte: data.endWeek },
      endWeek: { gte: data.startWeek },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    include: { course: { select: { name: true } } },
  });
  if (teacherConflict) {
    conflicts.push(`教师「${course.teacher?.name || ''}」此时段已排「${teacherConflict.course.name}」`);
  }

  // 班级冲突
  const classConflict = await prisma.schedule.findFirst({
    where: {
      classId: data.classId,
      weekDay: data.weekDay,
      startSection: { lte: data.endSection },
      endSection: { gte: data.startSection },
      startWeek: { lte: data.endWeek },
      endWeek: { gte: data.startWeek },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    include: { course: { select: { name: true } } },
  });
  if (classConflict) {
    conflicts.push(`班级此时段已排「${classConflict.course.name}」`);
  }

  return conflicts;
}

export async function createSchedule(data: CreateScheduleData) {
  // 基础校验
  if (data.weekDay < 1 || data.weekDay > 7) throw ApiError.badRequest('星期取值 1-7');
  if (data.startSection > data.endSection) throw ApiError.badRequest('起始节次不能大于结束节次');
  if (data.startWeek > data.endWeek) throw ApiError.badRequest('起始周次不能大于结束周次');

  const conflicts = await detectConflicts(data);
  if (conflicts.length > 0) {
    throw ApiError.badRequest(`排课冲突：${conflicts.join('；')}`);
  }

  return prisma.schedule.create({ data });
}

export async function updateSchedule(id: string, data: Partial<CreateScheduleData>) {
  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('排课记录不存在');

  const merged = { ...existing, ...data } as CreateScheduleData;
  if (merged.startSection > merged.endSection) throw ApiError.badRequest('起始节次不能大于结束节次');
  if (merged.startWeek > merged.endWeek) throw ApiError.badRequest('起始周次不能大于结束周次');

  const conflicts = await detectConflicts(merged, id);
  if (conflicts.length > 0) {
    throw ApiError.badRequest(`排课冲突：${conflicts.join('；')}`);
  }

  return prisma.schedule.update({ where: { id }, data });
}

export async function removeSchedule(id: string) {
  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('排课记录不存在');

  // 检查是否有关联考勤记录
  const attendanceCount = await prisma.attendanceRecord.count({ where: { scheduleId: id } });
  if (attendanceCount > 0) {
    throw ApiError.badRequest('该排课已有考勤记录，无法删除');
  }

  await prisma.schedule.delete({ where: { id } });
}

/** 课表批量发布：当前实现为空操作（排课创建即生效），保留接口供前端调用 */
export async function publishSchedules(ids: string[]): Promise<{ count: number }> {
  // 排课创建即视为已发布，这里仅校验记录存在
  const count = await prisma.schedule.count({ where: { id: { in: ids } } });
  return { count };
}
