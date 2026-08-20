import { get } from '@shared-web/utils/request';

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

/** GET /api/admin/dashboard/stats —— 工作台概览统计 */
export function getDashboardStats(): Promise<DashboardStats> {
  return get('/admin/dashboard/stats');
}
