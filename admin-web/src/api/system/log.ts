import { get } from '@shared-web/utils/request';
import type { PageResult } from '@shared-web/types';

export interface LoginLog {
  id: string;
  username: string;
  ip: string;
  location?: string;
  browser?: string;
  os?: string;
  status: string;
  message?: string;
  loginAt: string;
}

export interface OperationLog {
  id: string;
  adminId: string;
  adminName?: string;
  module: string;
  action: string;
  method: string;
  url: string;
  params?: string;
  ip: string;
  costTime: number;
  createdAt: string;
}

export interface LogQueryParams {
  page?: number;
  pageSize?: number;
  username?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface OperationLogQueryParams {
  page?: number;
  pageSize?: number;
  adminId?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
}

/** 登录日志 */
export function getLoginLogs(params: LogQueryParams): Promise<PageResult<LoginLog>> {
  return get('/admin/system/logs/login', params);
}

/** 操作日志 */
export function getOperationLogs(params: OperationLogQueryParams): Promise<PageResult<OperationLog>> {
  return get('/admin/system/logs/operation', params);
}
