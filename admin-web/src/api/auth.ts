import { get, post, put } from '@shared-web/utils/request';
import type { Admin, Menu } from '@shared-web/types';

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  admin: Admin;
}

export interface AdminInfo extends Admin {
  permissions: string[];
}

export interface RegisterParams {
  username: string;
  password: string;
  confirmPassword: string;
  realName: string;
  phone?: string;
}

/** 管理员注册（默认禁用，需超管审核激活） */
export function register(params: RegisterParams): Promise<{ id: string; username: string }> {
  return post('/admin/auth/register', params);
}

/** 管理员登录 */
export function login(params: LoginParams): Promise<LoginResult> {
  return post('/admin/auth/login', params);
}

/** 获取当前管理员信息 + 权限 */
export function getAdminInfo(): Promise<AdminInfo> {
  return get('/admin/auth/info');
}

/** 获取动态菜单树 */
export function getMenus(): Promise<Menu[]> {
  return get('/admin/auth/menus');
}

/** 修改密码 */
export function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  return put('/admin/auth/password', { oldPassword, newPassword });
}

/** 刷新 Token */
export function refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  return post('/admin/auth/refresh', { refreshToken });
}

/** 登出 */
export function logout(refreshToken: string): Promise<void> {
  return post('/admin/auth/logout', { refreshToken });
}
