import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as authService from '../../services/student/auth.service';

/** POST /api/student/auth/register */
export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  res.json(success(result, '注册成功，请等待管理员分配院系/班级后使用完整功能'));
}

/** POST /api/student/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const { studentNo, password } = req.body;
  const result = await authService.login(studentNo, password);
  const msg = result.pendingAssign
    ? '登录成功，您的账号尚待管理员分配院系/班级，部分功能受限'
    : '登录成功';
  res.json(success(result, msg));
}

/** POST /api/student/auth/refresh */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  res.json(success(result, 'Token 已刷新'));
}

/** POST /api/student/auth/logout */
export async function logout(req: Request, res: Response): Promise<void> {
  const header = req.headers.authorization;
  const accessToken = header && header.startsWith('Bearer ') ? header.slice(7) : undefined;
  const { refreshToken } = req.body || {};
  await authService.logout(accessToken, refreshToken);
  res.json(success(null, '已登出'));
}
