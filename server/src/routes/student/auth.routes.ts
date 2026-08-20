import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware } from '../../shared/auth/middleware';
import * as authController from '../../controllers/student/auth.controller';

const router = Router();

const registerSchema = z.object({
  studentNo: z.string().min(8, '学号至少8位').max(12, '学号最多12位'),
  password: z.string().min(8, '密码至少8位').max(20, '密码最多20位'),
  confirmPassword: z.string().min(8, '确认密码至少8位').max(20, '确认密码最多20位'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多50字'),
  gender: z.enum(['MALE', 'FEMALE'], { message: '性别参数错误' }),
  phone: z.string().optional(),
  email: z.string().optional(),
});

const loginSchema = z.object({
  studentNo: z.string().min(1, '学号不能为空'),
  password: z.string().min(1, '密码不能为空'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken 不能为空'),
});

/** POST /api/student/auth/register —— 学生注册 */
router.post('/register', validate({ body: registerSchema }), asyncHandler(authController.register));

/** POST /api/student/auth/login —— 学号 + 密码登录 */
router.post('/login', validate({ body: loginSchema }), asyncHandler(authController.login));

/** POST /api/student/auth/refresh —— 刷新 Token */
router.post('/refresh', validate({ body: refreshSchema }), asyncHandler(authController.refresh));

/** POST /api/student/auth/logout —— 登出 */
router.post('/logout', authMiddleware, asyncHandler(authController.logout));

export default router;
