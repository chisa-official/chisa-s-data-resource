import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import {
  Gender,
  StudentStatus,
  StatusChangeType,
  AwardType,
  ApplyStatus,
  DisciplineType,
  AttendanceStatus,
  RepairStatus,
} from '@prisma/client';

// ========== 通用辅助 ==========

const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  NORMAL: '在校',
  SUSPENDED: '休学',
  RESUMED: '复学',
  DROPPED: '退学',
  HELD_BACK: '留级',
  GRADUATED: '毕业',
};

const STATUS_CHANGE_TYPE_LABEL: Record<StatusChangeType, string> = {
  SUSPEND: '休学',
  RESUME: '复学',
  TRANSFER_MAJOR: '转专业',
  DROP_OUT: '退学',
};

const AWARD_TYPE_LABEL: Record<AwardType, string> = {
  SCHOLARSHIP: '奖学金',
  AID: '助学金',
  LOAN: '助学贷款',
  HONOR: '评优',
};

const DISCIPLINE_TYPE_LABEL: Record<DisciplineType, string> = {
  WARNING: '警告',
  SERIOUS_WARNING: '严重警告',
  DEMERIT: '记过',
  EXPEL: '开除',
};

const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: '出勤',
  ABSENT: '缺勤',
  LATE: '迟到',
  LEAVE: '请假',
};

const APPLY_STATUS_LABEL: Record<ApplyStatus, string> = {
  PENDING: '待审批',
  APPROVED: '通过',
  REJECTED: '驳回',
};

const GENDER_LABEL: Record<Gender, string> = {
  MALE: '男',
  FEMALE: '女',
};

/** 拉取院系 ID->名称 映射 */
async function getDepartmentMap(): Promise<Map<string, string>> {
  const list = await prisma.department.findMany({ select: { id: true, name: true } });
  return new Map(list.map((d) => [d.id, d.name]));
}

function parseDateRange(startDate?: string, endDate?: string): { gte?: Date; lte?: Date } {
  const where: { gte?: Date; lte?: Date } = {};
  if (startDate) where.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.lte = end;
  }
  return where;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ========== 1. 学生人数统计 ==========

export interface StudentCountReport {
  total: number;
  byGender: { name: string; value: number }[];
  byStatus: { name: string; value: number }[];
  byGrade: { grade: number; count: number }[];
  byDepartment: { departmentId: string; departmentName: string; count: number }[];
}

export async function getStudentCountReport(departmentId?: string): Promise<StudentCountReport> {
  const where: any = {};
  if (departmentId) where.departmentId = departmentId;

  const [total, byGender, byStatus, deptMap] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.groupBy({ by: ['gender'], _count: true, where }),
    prisma.student.groupBy({ by: ['status'], _count: true, where }),
    getDepartmentMap(),
  ]);

  // 按年级统计（grade 在 Class 上，需关联查询后内存聚合）
  const studentsWithClass = await prisma.student.findMany({
    where,
    select: { class: { select: { grade: true } } },
  });
  const gradeMap = new Map<number, number>();
  studentsWithClass.forEach((s) => {
    const g = s.class?.grade;
    if (g != null) gradeMap.set(g, (gradeMap.get(g) || 0) + 1);
  });

  // 按院系统计
  const byDeptGroup = await prisma.student.groupBy({ by: ['departmentId'], _count: true, where });

  return {
    total,
    byGender: byGender.map((g) => ({ name: GENDER_LABEL[g.gender] || g.gender, value: g._count })),
    byStatus: byStatus.map((s) => ({ name: STUDENT_STATUS_LABEL[s.status] || s.status, value: s._count })),
    byGrade: Array.from(gradeMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([grade, count]) => ({ grade, count })),
    byDepartment: byDeptGroup
      .map((d) => ({ departmentId: d.departmentId, departmentName: deptMap.get(d.departmentId) || '未知院系', count: d._count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ========== 2. 学籍异动统计 ==========

export interface StatusChangeReport {
  total: number;
  byType: { name: string; value: number }[];
  byMonth: { month: string; count: number }[];
}

export async function getStatusChangeReport(startDate?: string, endDate?: string): Promise<StatusChangeReport> {
  const dateRange = parseDateRange(startDate, endDate);
  const where: any = {};
  if (dateRange.gte || dateRange.lte) where.createdAt = dateRange;

  const [total, byTypeGroup, records] = await Promise.all([
    prisma.statusChange.count({ where }),
    prisma.statusChange.groupBy({ by: ['type'], _count: true, where }),
    prisma.statusChange.findMany({ where, select: { createdAt: true } }),
  ]);

  const monthMap = new Map<string, number>();
  records.forEach((r) => {
    const k = monthKey(r.createdAt);
    monthMap.set(k, (monthMap.get(k) || 0) + 1);
  });

  return {
    total,
    byType: byTypeGroup.map((t) => ({ name: STATUS_CHANGE_TYPE_LABEL[t.type] || t.type, value: t._count })),
    byMonth: Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count })),
  };
}

// ========== 3. 考勤统计 ==========

export interface AttendanceReport {
  summary: { total: number; present: number; absent: number; late: number; leave: number };
  byClass: { classId: string; className: string; total: number; present: number; absent: number; late: number; leave: number; rate: number }[];
}

export async function getAttendanceReport(startDate?: string, endDate?: string): Promise<AttendanceReport> {
  const dateRange = parseDateRange(startDate, endDate);
  const where: any = {};
  if (dateRange.gte || dateRange.lte) where.date = dateRange;

  const [totalGroup, records] = await Promise.all([
    prisma.attendanceRecord.groupBy({ by: ['status'], _count: true, where }),
    prisma.attendanceRecord.findMany({
      where,
      select: { status: true, student: { select: { classId: true, class: { select: { id: true, name: true } } } } },
    }),
  ]);

  const summary = { total: 0, present: 0, absent: 0, late: 0, leave: 0 };
  totalGroup.forEach((g) => {
    const label = ATTENDANCE_STATUS_LABEL[g.status] || g.status;
    if (g.status === AttendanceStatus.PRESENT) summary.present = g._count;
    else if (g.status === AttendanceStatus.ABSENT) summary.absent = g._count;
    else if (g.status === AttendanceStatus.LATE) summary.late = g._count;
    else if (g.status === AttendanceStatus.LEAVE) summary.leave = g._count;
    summary.total += g._count;
  });

  // 按班级聚合
  const classMap = new Map<string, { classId: string; className: string; total: number; present: number; absent: number; late: number; leave: number }>();
  records.forEach((r) => {
    const cls = r.student?.class;
    if (!cls) return;
    const entry = classMap.get(cls.id) || { classId: cls.id, className: cls.name, total: 0, present: 0, absent: 0, late: 0, leave: 0 };
    entry.total += 1;
    if (r.status === AttendanceStatus.PRESENT) entry.present += 1;
    else if (r.status === AttendanceStatus.ABSENT) entry.absent += 1;
    else if (r.status === AttendanceStatus.LATE) entry.late += 1;
    else if (r.status === AttendanceStatus.LEAVE) entry.leave += 1;
    classMap.set(cls.id, entry);
  });

  const byClass = Array.from(classMap.values()).map((c) => ({
    ...c,
    rate: c.total === 0 ? 0 : Math.round((c.present / c.total) * 10000) / 100,
  }));

  return { summary, byClass: byClass.sort((a, b) => a.rate - b.rate) };
}

// ========== 4. 奖助学金统计 ==========

export interface AwardReport {
  totalCount: number;
  totalAmount: number;
  byType: { name: string; type: AwardType; count: number; amount: number }[];
  byStatus: { name: string; value: number }[];
  byDepartment: { departmentName: string; SCHOLARSHIP: number; AID: number; LOAN: number; HONOR: number }[];
}

export async function getAwardReport(semester?: string): Promise<AwardReport> {
  const where: any = {};
  if (semester) where.semester = semester;

  const [byTypeGroup, byStatusGroup, records, deptMap] = await Promise.all([
    prisma.award.groupBy({ by: ['type'], _count: true, _sum: { amount: true }, where }),
    prisma.award.groupBy({ by: ['status'], _count: true, where }),
    prisma.award.findMany({
      where,
      select: { type: true, amount: true, student: { select: { department: { select: { name: true } } } } },
    }),
    getDepartmentMap(),
  ]);

  let totalCount = 0;
  let totalAmount = 0;
  const byType = byTypeGroup.map((t) => {
    const count = t._count;
    const amount = t._sum.amount || 0;
    totalCount += count;
    totalAmount += amount;
    return { name: AWARD_TYPE_LABEL[t.type] || t.type, type: t.type, count, amount };
  });

  // 按院系 × 类型 聚合（用于堆叠柱状图）
  const deptTypeMap = new Map<string, { departmentName: string; SCHOLARSHIP: number; AID: number; LOAN: number; HONOR: number }>();
  records.forEach((r) => {
    const deptName = r.student?.department?.name || '未知院系';
    const entry = deptTypeMap.get(deptName) || { departmentName: deptName, SCHOLARSHIP: 0, AID: 0, LOAN: 0, HONOR: 0 };
    entry[r.type] += 1;
    deptTypeMap.set(deptName, entry);
  });

  return {
    totalCount,
    totalAmount: Math.round(totalAmount * 100) / 100,
    byType,
    byStatus: byStatusGroup.map((s) => ({ name: APPLY_STATUS_LABEL[s.status] || s.status, value: s._count })),
    byDepartment: Array.from(deptTypeMap.values()).sort((a, b) =>
      (b.SCHOLARSHIP + b.AID + b.LOAN + b.HONOR) - (a.SCHOLARSHIP + a.AID + a.LOAN + a.HONOR),
    ),
  };
}

// ========== 5. 违纪统计 ==========

export interface DisciplineReport {
  total: number;
  byType: { name: string; value: number }[];
  byDepartment: { departmentName: string; count: number }[];
}

export async function getDisciplineReport(startDate?: string, endDate?: string): Promise<DisciplineReport> {
  const dateRange = parseDateRange(startDate, endDate);
  const where: any = {};
  if (dateRange.gte || dateRange.lte) where.occurredAt = dateRange;

  const [total, byTypeGroup, records, deptMap] = await Promise.all([
    prisma.discipline.count({ where }),
    prisma.discipline.groupBy({ by: ['type'], _count: true, where }),
    prisma.discipline.findMany({
      where,
      select: { student: { select: { department: { select: { name: true } } } } },
    }),
    getDepartmentMap(),
  ]);

  const deptCountMap = new Map<string, number>();
  records.forEach((r) => {
    const deptName = r.student?.department?.name || '未知院系';
    deptCountMap.set(deptName, (deptCountMap.get(deptName) || 0) + 1);
  });

  return {
    total,
    byType: byTypeGroup.map((t) => ({ name: DISCIPLINE_TYPE_LABEL[t.type] || t.type, value: t._count })),
    byDepartment: Array.from(deptCountMap.entries())
      .map(([departmentName, count]) => ({ departmentName, count }))
      .sort((a, b) => b.count - a.count),
  };
}

// ========== Dashboard 概览统计 ==========

export interface DashboardStats {
  studentCount: number;
  teacherCount: number;
  courseCount: number;
  noticeCount: number;
  pendingStatusChanges: number;
  pendingLeaves: number;
  pendingAwards: number;
  pendingRepairs: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [
    studentCount,
    teacherCount,
    courseCount,
    noticeCount,
    pendingStatusChanges,
    pendingLeaves,
    pendingAwards,
    pendingRepairs,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.course.count(),
    prisma.notice.count({ where: { published: true } }),
    prisma.statusChange.count({ where: { status: ApplyStatus.PENDING } }),
    prisma.leaveApply.count({ where: { status: ApplyStatus.PENDING } }),
    prisma.award.count({ where: { status: ApplyStatus.PENDING } }),
    prisma.repair.count({ where: { status: RepairStatus.PENDING } }),
  ]);

  return {
    studentCount,
    teacherCount,
    courseCount,
    noticeCount,
    pendingStatusChanges,
    pendingLeaves,
    pendingAwards,
    pendingRepairs,
  };
}

// ========== 报表导出数据组装 ==========

export type ReportType = 'student' | 'status' | 'attendance' | 'award' | 'discipline';

/** 获取报表数据（供导出复用） */
export async function getReportData(type: ReportType, query: any): Promise<any> {
  switch (type) {
    case 'student':
      return getStudentCountReport(query.departmentId);
    case 'status':
      return getStatusChangeReport(query.startDate, query.endDate);
    case 'attendance':
      return getAttendanceReport(query.startDate, query.endDate);
    case 'award':
      return getAwardReport(query.semester);
    case 'discipline':
      return getDisciplineReport(query.startDate, query.endDate);
    default:
      throw ApiError.badRequest('不支持的报表类型');
  }
}
