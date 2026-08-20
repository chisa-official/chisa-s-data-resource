import { Request } from 'express';
import { ApiError } from '../shared/error/ApiError';

/** 从 req.user 校验管理员身份并返回 adminId */
export function requireAdminId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.userType !== 'ADMIN') throw ApiError.forbidden('仅管理员可访问');
  return req.user.userId;
}

/** 获取当前管理员的角色 code */
export function requireAdminRole(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.userType !== 'ADMIN') throw ApiError.forbidden('仅管理员可访问');
  return req.user.role || '';
}

/** 判断是否超级管理员 */
export function isSuperAdmin(req: Request): boolean {
  return req.user?.role === 'SUPER_ADMIN';
}
