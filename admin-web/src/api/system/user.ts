import { get, post, put, del } from '@shared-web/utils/request';
import type { Admin, AdminStatus, PageResult } from '@shared-web/types';

export interface UserListParams {
  page?: number;
  pageSize?: number;
  username?: string;
  realName?: string;
  status?: string;
  roleId?: string;
}

export interface UserListResult extends Omit<Admin, 'role'> {
  role?: { id: string; name: string; code: string };
}

export interface CreateUserParams {
  username: string;
  password: string;
  realName: string;
  roleId: string;
  phone?: string;
}

export interface UpdateUserParams {
  realName?: string;
  roleId?: string;
  phone?: string;
  password?: string;
}

/** 管理员列表 */
export function listUsers(params: UserListParams): Promise<PageResult<UserListResult>> {
  return get('/admin/system/users', params);
}

/** 管理员详情 */
export function getUser(id: string): Promise<Admin> {
  return get(`/admin/system/users/${id}`);
}

/** 创建管理员 */
export function createUser(params: CreateUserParams): Promise<Admin> {
  return post('/admin/system/users', params);
}

/** 更新管理员 */
export function updateUser(id: string, params: UpdateUserParams): Promise<Admin> {
  return put(`/admin/system/users/${id}`, params);
}

/** 切换启用/禁用 */
export function toggleUserStatus(id: string): Promise<{ id: string; status: AdminStatus }> {
  return put(`/admin/system/users/${id}/status`);
}

/** 删除管理员 */
export function deleteUser(id: string): Promise<void> {
  return del(`/admin/system/users/${id}`);
}
