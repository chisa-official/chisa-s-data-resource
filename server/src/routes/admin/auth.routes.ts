import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware } from '../../shared/auth/middleware';
import { adminOnly } from '../../shared/auth/middleware';
import * as authController from '../../controllers/admin/auth.controller';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(4, '用户名至少4位').max(20, '用户名最多20位'),
  password: z.string().min(8, '密码至少8位').max(20, '密码最多20位'),
  confirmPassword: z.string().min(8, '确认密码至少8位').max(20, '确认密码最多20位'),
  realName: z.string().min(1, '真实姓名不能为空').max(50, '真实姓名最多50字'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken 不能为空'),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1, '原密码不能为空'),
  newPassword: z.string().min(6, '新密码至少6位'),
});

/** POST /api/admin/auth/register —— 管理员注册（默认禁用，需超管审核激活） */
router.post('/register', validate({ body: registerSchema }), asyncHandler(authController.register));

/** POST /api/admin/auth/login —— 管理员登录 */
router.post('/login', validate({ body: loginSchema }), asyncHandler(authController.login));

/** POST /api/admin/auth/refresh —— 刷新 Token */
router.post('/refresh', validate({ body: refreshSchema }), asyncHandler(authController.refresh));

/** POST /api/admin/auth/logout —— 登出 */
router.post('/logout', authMiddleware, adminOnly, asyncHandler(authController.logout));

/** GET /api/admin/auth/info —— 当前管理员信息 + 权限 */
router.get('/info', authMiddleware, adminOnly, asyncHandler(authController.info));

/** GET /api/admin/auth/menus —— 动态菜单树 */
router.get('/menus', authMiddleware, adminOnly, asyncHandler(authController.menus));

/** PUT /api/admin/auth/password —— 修改密码 */
router.put('/password', authMiddleware, adminOnly, validate({ body: passwordSchema }), asyncHandler(authController.password));

export default router;
