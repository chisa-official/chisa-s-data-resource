import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { AttendanceStatus } from '@prisma/client';

// ========== 考勤录入 ==========

export interface AttendanceImportItem {
  studentNo: string;
  courseId: string;
  scheduleId: string;
  date: string;     // YYYY-MM-DD
  status: AttendanceStatus;
}

/** 批量录入考勤记录（手动或 Excel 解析后调用） */
export async function importAttendance(items: AttendanceImportItem[]) {
  if (!items.length) throw ApiError.badRequest('考勤数据不能为空');

  // 校验学号 → 学生 ID 映射
  const studentNos = [...new Set(items.map((i) => i.studentNo))];
  const students = await prisma.student.findMany({
    where: { studentNo: { in: studentNos } },
    select: { id: true, studentNo: true },
  });
  const studentMap = new Map(students.map((s) => [s.studentNo, s.id]));
  const unknownNos = studentNos.filter((no) => !studentMap.has(no));
  if (unknownNos.length) {
    throw ApiError.badRequest(`学号不存在: ${unknownNos.slice(0, 5).join(', ')}${unknownNos.length > 5 ? '...' : ''}`);
  }

  const now = new Date();
  const records = items.map((item) => {
    const date = new Date(item.date);
    if (isNaN(date.getTime())) throw ApiError.badRequest(`日期格式错误: ${item.date}`);
    return {
      studentId: studentMap.get(item.studentNo)!,
      courseId: item.courseId,
      scheduleId: item.scheduleId,
      date,
      status: item.status,
    };
  });

  // 批量创建（忽略唯一约束冲突，若无唯一约束则直接插入）
  const result = await prisma.attendanceRecord.createMany({ data: records, skipDuplicates: true });
  return { total: items.length, successCount: result.count, failCount: items.length - result.count };
}

// ========== 考勤记录查询 ==========

export interface AttendanceListParams {
  page: number;
  pageSize: number;
  studentNo?: string;
  studentName?: string;
  classId?: string;
  courseId?: string;
  status?: AttendanceStatus;
  startDate?: string;
  endDate?: string;
}

export async function listAttendance(params: AttendanceListParams) {
  const where: any = {};
  if (params.status) where.status = params.status;
  if (params.courseId) where.courseId = params.courseId;
  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) where.date.gte = new Date(params.startDate);
    if (params.endDate) where.date.lte = new Date(params.endDate);
  }
  if (params.studentNo || params.studentName || params.classId) {
    where.student = {};
    if (params.studentNo) where.student.studentNo = { contains: params.studentNo };
    if (params.studentName) where.student.name = { contains: params.studentName };
    if (params.classId) where.student.classId = params.classId;
  }

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            studentNo: true,
            name: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.attendanceRecord.count({ where }),
  ]);

  // 手动关联课程信息（schema 中无 course 关系）
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

  return { list, total, page: params.page, pageSize: params.pageSize };
}

// ========== 考勤统计 ==========

export interface AttendanceStatisticsParams {
  classId?: string;
  startDate?: string;
  endDate?: string;
}

/** 按班级统计考勤情况 */
export async function getAttendanceStatistics(params: AttendanceStatisticsParams) {
  const where: any = {};
  if (params.startDate || params.endDate) {
    where.date = {};
    if (params.startDate) where.date.gte = new Date(params.startDate);
    if (params.endDate) where.date.lte = new Date(params.endDate);
  }
  if (params.classId) {
    where.student = { classId: params.classId };
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    select: { status: true, student: { select: { classId: true, class: { select: { name: true } } } } },
  });

  // 按班级聚合
  const classMap = new Map<string, { className: string; total: number; present: number; absent: number; late: number; leave: number }>();
  for (const r of records) {
    const classId = r.student.classId;
    const className = r.student.class?.name || '未知班级';
    if (!classMap.has(classId)) {
      classMap.set(classId, { className, total: 0, present: 0, absent: 0, late: 0, leave: 0 });
    }
    const stat = classMap.get(classId)!;
    stat.total++;
    if (r.status === 'PRESENT') stat.present++;
    else if (r.status === 'ABSENT') stat.absent++;
    else if (r.status === 'LATE') stat.late++;
    else if (r.status === 'LEAVE') stat.leave++;
  }

  const byClass = [...classMap.values()].map((s) => ({
    ...s,
    rate: s.total > 0 ? Number(((s.present / s.total) * 100).toFixed(1)) : 0,
  }));

  // 总体统计
  const summary = {
    total: records.length,
    present: records.filter((r) => r.status === 'PRESENT').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    late: records.filter((r) => r.status === 'LATE').length,
    leave: records.filter((r) => r.status === 'LEAVE').length,
  };

  return { summary, byClass };
}

// ========== 考勤预警 ==========

export interface AttendanceWarningParams {
  classId?: string;
}

/** 预警名单：旷课次数超过阈值的学生 */
export async function getAttendanceWarnings(params: AttendanceWarningParams) {
  // 读取预警规则
  const rule = await prisma.attendanceRule.findFirst({ orderBy: { createdAt: 'desc' } });
  const threshold = rule?.threshold ?? 3;

  const where: any = { status: 'ABSENT' };
  if (params.classId) {
    where.student = { classId: params.classId };
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    select: {
      student: {
        select: {
          id: true,
          studentNo: true,
          name: true,
          class: { select: { id: true, name: true } },
          department: { select: { name: true } },
        },
      },
    },
  });

  // 按学生聚合旷课次数
  const studentMap = new Map<string, { student: any; absentCount: number }>();
  for (const r of records) {
    const sid = r.student.id;
    if (!studentMap.has(sid)) {
      studentMap.set(sid, { student: r.student, absentCount: 0 });
    }
    studentMap.get(sid)!.absentCount++;
  }

  const list = [...studentMap.values()]
    .filter((s) => s.absentCount >= threshold)
    .map((s) => ({
      studentId: s.student.id,
      studentNo: s.student.studentNo,
      name: s.student.name,
      className: s.student.class?.name || '',
      departmentName: s.student.department?.name || '',
      absentCount: s.absentCount,
      threshold,
    }))
    .sort((a, b) => b.absentCount - a.absentCount);

  return { threshold, list };
}

// ========== 预警规则配置 ==========

export async function getAttendanceRule() {
  const rule = await prisma.attendanceRule.findFirst({ orderBy: { createdAt: 'desc' } });
  return rule ?? { threshold: 3, notifyRole: 'COUNSELOR' };
}

export async function updateAttendanceRule(data: { threshold: number; notifyRole: string }) {
  if (data.threshold < 1) throw ApiError.badRequest('预警阈值必须大于 0');
  if (!data.notifyRole) throw ApiError.badRequest('通知角色不能为空');

  const existing = await prisma.attendanceRule.findFirst({ orderBy: { createdAt: 'desc' } });
  if (existing) {
    return prisma.attendanceRule.update({
      where: { id: existing.id },
      data: { threshold: data.threshold, notifyRole: data.notifyRole },
    });
  }
  return prisma.attendanceRule.create({
    data: { threshold: data.threshold, notifyRole: data.notifyRole },
  });
}
