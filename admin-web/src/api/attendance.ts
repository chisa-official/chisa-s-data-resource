import { get, post, put } from '@shared-web/utils/request';
import type { PageResult, AttendanceStatus } from '@shared-web/types';

// ========== 考勤录入 ==========

export interface AttendanceImportItem {
  studentNo: string;
  courseId: string;
  scheduleId: string;
  date: string;
  status: AttendanceStatus;
}

export function importAttendance(items: AttendanceImportItem[]): Promise<{
  total: number;
  successCount: number;
  failCount: number;
}> {
  return post('/admin/attendance/import', { items });
}

// ========== 考勤记录查询 ==========

export interface AttendanceListResult {
  id: string;
  studentId: string;
  courseId: string;
  scheduleId: string;
  date: string;
  status: AttendanceStatus;
  createdAt?: string;
  student?: {
    id: string;
    studentNo: string;
    name: string;
    class?: { id: string; name: string };
  };
  course?: { id: string; name: string; code: string } | null;
}

export function listAttendance(params: {
  page?: number;
  pageSize?: number;
  studentNo?: string;
  studentName?: string;
  classId?: string;
  courseId?: string;
  status?: AttendanceStatus;
  startDate?: string;
  endDate?: string;
}): Promise<PageResult<AttendanceListResult>> {
  return get('/admin/attendance/list', params);
}

// ========== 考勤统计 ==========

export interface ClassAttendanceStat {
  className: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  rate: number;
}

export interface AttendanceStatisticsResult {
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
  };
  byClass: ClassAttendanceStat[];
}

export function getAttendanceStatistics(params: {
  classId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<AttendanceStatisticsResult> {
  return get('/admin/attendance/statistics', params);
}

// ========== 考勤预警 ==========

export interface AttendanceWarning {
  studentId: string;
  studentNo: string;
  name: string;
  className: string;
  departmentName: string;
  absentCount: number;
  threshold: number;
}

export interface AttendanceWarningResult {
  threshold: number;
  list: AttendanceWarning[];
}

export function getAttendanceWarnings(params: { classId?: string }): Promise<AttendanceWarningResult> {
  return get('/admin/attendance/warning', params);
}

// ========== 预警规则配置 ==========

export interface AttendanceRule {
  id?: string;
  threshold: number;
  notifyRole: string;
}

export function getAttendanceRule(): Promise<AttendanceRule> {
  return get('/admin/attendance/rules');
}

export function updateAttendanceRule(data: { threshold: number; notifyRole: string }): Promise<AttendanceRule> {
  return put('/admin/attendance/rules', data);
}
