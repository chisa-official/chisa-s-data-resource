import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as authService from '../../services/admin/auth.service';
import { requireAdminId } from '../../middlewares/admin';

/** POST /api/admin/auth/register */
export async function register(req: Request, res: Response): Promise<void> {
  const result = await authService.register(req.body);
  res.json(success(result, '注册成功，请等待系统管理员审核激活后登录'));
}

/** POST /api/admin/auth/login */
export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress;
  const result = await authService.login(username, password, ip);
  res.json(success(result, '登录成功'));
}

/** GET /api/admin/auth/info */
export async function info(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const result = await authService.getAdminInfo(adminId);
  res.json(success(result));
}

/** GET /api/admin/auth/menus */
export async function menus(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const result = await authService.getMenuTree(adminId);
  res.json(success(result));
}

/** PUT /api/admin/auth/password */
export async function password(req: Request, res: Response): Promise<void> {
  const adminId = requireAdminId(req);
  const { oldPassword, newPassword } = req.body;
  await authService.changePassword(adminId, oldPassword, newPassword);
  res.json(success(null, '密码修改成功'));
}

/** POST /api/admin/auth/refresh */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  const result = await authService.refresh(refreshToken);
  res.json(success(result, 'Token 已刷新'));
}

/** POST /api/admin/auth/logout */
export async function logout(req: Request, res: Response): Promise<void> {
  const header = req.headers.authorization;
  const accessToken = header && header.startsWith('Bearer ') ? header.slice(7) : undefined;
  const { refreshToken } = req.body || {};
  await authService.logout(accessToken, refreshToken);
  res.json(success(null, '已登出'));
}
