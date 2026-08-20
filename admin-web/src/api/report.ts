import { get } from '@shared-web/utils/request';
import { downloadFile } from '@shared-web/utils/download';

// ========== 报表类型 ==========

export type ReportType = 'student' | 'status' | 'attendance' | 'award' | 'discipline';
export type ExportFormat = 'excel' | 'pdf';

export interface StudentCountReport {
  total: number;
  byGender: { name: string; value: number }[];
  byStatus: { name: string; value: number }[];
  byGrade: { grade: number; count: number }[];
  byDepartment: { departmentId: string; departmentName: string; count: number }[];
}

export interface StatusChangeReport {
  total: number;
  byType: { name: string; value: number }[];
  byMonth: { month: string; count: number }[];
}

export interface AttendanceReport {
  summary: { total: number; present: number; absent: number; late: number; leave: number };
  byClass: {
    classId: string;
    className: string;
    total: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    rate: number;
  }[];
}

export interface AwardReport {
  totalCount: number;
  totalAmount: number;
  byType: { name: string; type: string; count: number; amount: number }[];
  byStatus: { name: string; value: number }[];
  byDepartment: { departmentName: string; SCHOLARSHIP: number; AID: number; LOAN: number; HONOR: number }[];
}

export interface DisciplineReport {
  total: number;
  byType: { name: string; value: number }[];
  byDepartment: { departmentName: string; count: number }[];
}

// ========== 报表统计接口 ==========

export function getStudentCountReport(departmentId?: string): Promise<StudentCountReport> {
  return get('/admin/report/student-count', { departmentId });
}

export function getStatusChangeReport(startDate?: string, endDate?: string): Promise<StatusChangeReport> {
  return get('/admin/report/status-change', { startDate, endDate });
}

export function getAttendanceReport(startDate?: string, endDate?: string): Promise<AttendanceReport> {
  return get('/admin/report/attendance', { startDate, endDate });
}

export function getAwardReport(semester?: string): Promise<AwardReport> {
  return get('/admin/report/award', { semester });
}

export function getDisciplineReport(startDate?: string, endDate?: string): Promise<DisciplineReport> {
  return get('/admin/report/discipline', { startDate, endDate });
}

// ========== 报表导出 ==========

export function exportReport(
  type: ReportType,
  format: ExportFormat,
  params?: { startDate?: string; endDate?: string; semester?: string; departmentId?: string },
): Promise<void> {
  return downloadFile('/admin/report/export', { type, format, ...params }, `${type}_report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
}
