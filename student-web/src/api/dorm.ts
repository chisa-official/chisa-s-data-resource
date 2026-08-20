import { get, post } from './request';
import type {
  PageResult,
  DormAssignment,
  DormInspection,
  DormViolation,
} from '@shared-web/types';

/** 我的宿舍信息 */
export function getMyDorm(): Promise<DormAssignment | null> {
  return get('/student/dorm');
}

/** 卫生检查结果 */
export function getDormInspections(page = 1, pageSize = 10): Promise<PageResult<DormInspection>> {
  return get('/student/dorm/inspection', { page, pageSize });
}

/** 宿舍违纪通报 */
export function getDormViolations(page = 1, pageSize = 10): Promise<PageResult<DormViolation>> {
  return get('/student/dorm/violation', { page, pageSize });
}

/** 调宿申请 */
export function applyDormTransfer(params: { reason: string; preferredDorm?: string }): Promise<{ submitted: boolean; message: string }> {
  return post('/student/dorm/transfer', params);
}

/** 退宿申请 */
export function applyDormCheckout(params: { reason: string }): Promise<{ submitted: boolean; message: string }> {
  return post('/student/dorm/checkout', params);
}
