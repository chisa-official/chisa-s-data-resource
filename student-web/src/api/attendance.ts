import { get, post } from './request';
import type {
  PageResult,
  LeaveApply,
  AttendanceRecord,
  AttendanceStatistics,
  LeaveType,
} from '@shared-web/types';

export interface LeaveApplyParams {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
}

/** 提交请假申请 */
export function applyLeave(params: LeaveApplyParams): Promise<LeaveApply> {
  return post('/student/leave/apply', params);
}

/** 请假记录列表 */
export function getLeaveList(page = 1, pageSize = 10): Promise<PageResult<LeaveApply>> {
  return get('/student/leave/list', { page, pageSize });
}

/** 考勤记录（含 course 关联字段） */
export function getAttendanceRecords(
  startDate?: string,
  endDate?: string,
  page = 1,
  pageSize = 10,
): Promise<PageResult<AttendanceRecord>> {
  return get('/student/attendance/record', { startDate, endDate, page, pageSize });
}

/** 考勤统计 */
export function getAttendanceStatistics(
  startDate?: string,
  endDate?: string,
): Promise<AttendanceStatistics> {
  return get('/student/attendance/statistics', startDate || endDate ? { startDate, endDate } : {});
}
