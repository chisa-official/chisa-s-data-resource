import { get, post, put, del } from '@shared-web/utils/request';
import type { Role, DataScope } from '@shared-web/types';

export interface RoleListResult extends Role {
  adminCount?: number;
}

export interface CreateRoleParams {
  name: string;
  code: string;
  dataScope: DataScope;
  permissions?: string[];
}

export interface UpdateRoleParams {
  name?: string;
  dataScope?: DataScope;
  permissions?: string[];
}

/** 角色列表 */
export function listRoles(): Promise<RoleListResult[]> {
  return get('/admin/system/roles');
}

/** 角色详情 */
export function getRole(id: string): Promise<Role> {
  return get(`/admin/system/roles/${id}`);
}

/** 创建角色 */
export function createRole(params: CreateRoleParams): Promise<Role> {
  return post('/admin/system/roles', params);
}

/** 更新角色 */
export function updateRole(id: string, params: UpdateRoleParams): Promise<Role> {
  return put(`/admin/system/roles/${id}`, params);
}

/** 分配菜单权限 */
export function assignRoleMenus(id: string, menuIds: string[]): Promise<void> {
  return put(`/admin/system/roles/${id}/menus`, { menuIds });
}

/** 分配接口权限 */
export function assignRolePermissions(id: string, permissions: string[]): Promise<void> {
  return put(`/admin/system/roles/${id}/permissions`, { permissions });
}

/** 删除角色 */
export function deleteRole(id: string): Promise<void> {
  return del(`/admin/system/roles/${id}`);
}
