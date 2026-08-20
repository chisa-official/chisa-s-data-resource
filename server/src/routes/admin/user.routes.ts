import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as userController from '../../controllers/admin/user.controller';

const router = Router();

const createSchema = z.object({
  username: z.string().min(2, '用户名至少2位'),
  password: z.string().min(6, '密码至少6位'),
  realName: z.string().min(1, '姓名不能为空'),
  roleId: z.string().uuid('角色ID格式错误'),
  phone: z.string().optional(),
});

const updateSchema = z.object({
  realName: z.string().min(1).optional(),
  roleId: z.string().uuid().optional(),
  phone: z.string().optional(),
  password: z.string().min(6).optional(),
});

// 所有接口都需要管理员登录
router.use(authMiddleware, adminOnly);

/** GET /api/admin/system/users —— 管理员列表 */
router.get('/', asyncHandler(userController.list));

/** GET /api/admin/system/users/:id —— 管理员详情 */
router.get('/:id', asyncHandler(userController.getById));

/** POST /api/admin/system/users —— 创建管理员 */
router.post('/', validate({ body: createSchema }), asyncHandler(userController.create));

/** PUT /api/admin/system/users/:id —— 更新管理员 */
router.put('/:id', validate({ body: updateSchema }), asyncHandler(userController.update));

/** PUT /api/admin/system/users/:id/status —— 启用/禁用 */
router.put('/:id/status', asyncHandler(userController.toggleStatus));

/** DELETE /api/admin/system/users/:id —— 删除管理员 */
router.delete('/:id', asyncHandler(userController.remove));

export default router;
