import { Request, Response, NextFunction } from 'express';
import { UserType } from '@prisma/client';
import { verifyToken } from './jwt';
import { ApiError } from '../error/ApiError';
import { prisma } from '../utils/prisma';

// 扩展 Request 类型，挂载 user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        userType: UserType;
        role?: string;
        roleId?: string;
      };
      pagination?: {
        page: number;
        pageSize: number;
        skip: number;
        take: number;
      };
    }
  }
}

/** 解析 Token 并挂载 req.user */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw ApiError.unauthorized('缺少 Authorization 头');
    }
    const token = header.slice(7);
    const payload = await verifyToken(token);
    req.user = payload;
    next();
  } catch (e) {
    next(e);
  }
}

/** 角色校验：roleMiddleware('STUDENT') / roleMiddleware('SUPER_ADMIN', 'COUNSELOR') */
export function roleMiddleware(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role || '')) {
      return next(ApiError.forbidden('无权限访问'));
    }
    next();
  };
}

/** 仅学生 */
export const studentOnly = roleMiddleware('STUDENT');

/** 仅管理员（任意非 STUDENT 角色） */
export function adminOnly(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.userType !== UserType.ADMIN) {
    return next(ApiError.forbidden('仅管理员可访问'));
  }
  next();
}

/** 接口权限校验：从管理员角色 permissions 数组中查找 */
export async function permissionMiddleware(perm: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) return next(ApiError.unauthorized());
      if (req.user.userType !== UserType.ADMIN) return next(ApiError.forbidden());
      // 超级管理员放行
      if (req.user.role === 'SUPER_ADMIN') return next();
      // 查询角色权限
      const role = await prisma.role.findUnique({ where: { id: req.user.roleId! } });
      if (!role) return next(ApiError.forbidden());
      const permissions: string[] = (role.permissions as string[]) || [];
      if (!permissions.includes(perm)) {
        return next(ApiError.forbidden(`缺少权限: ${perm}`));
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}
