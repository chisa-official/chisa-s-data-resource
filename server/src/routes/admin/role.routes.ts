import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as roleController from '../../controllers/admin/role.controller';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1, '角色名称不能为空'),
  code: z.string().min(1, '角色编码不能为空'),
  dataScope: z.enum(['ALL', 'DEPARTMENT', 'SELF']),
  permissions: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  dataScope: z.enum(['ALL', 'DEPARTMENT', 'SELF']).optional(),
  permissions: z.array(z.string()).optional(),
});

const menuAssignSchema = z.object({
  menuIds: z.array(z.string()),
});

const permAssignSchema = z.object({
  permissions: z.array(z.string()),
});

router.use(authMiddleware, adminOnly);

/** GET /api/admin/system/roles —— 角色列表 */
router.get('/', asyncHandler(roleController.list));

/** GET /api/admin/system/roles/:id —— 角色详情 */
router.get('/:id', asyncHandler(roleController.getById));

/** POST /api/admin/system/roles —— 创建角色 */
router.post('/', validate({ body: createSchema }), asyncHandler(roleController.create));

/** PUT /api/admin/system/roles/:id —— 更新角色 */
router.put('/:id', validate({ body: updateSchema }), asyncHandler(roleController.update));

/** PUT /api/admin/system/roles/:id/menus —— 分配菜单权限 */
router.put('/:id/menus', validate({ body: menuAssignSchema }), asyncHandler(roleController.assignMenus));

/** PUT /api/admin/system/roles/:id/permissions —— 分配接口权限 */
router.put('/:id/permissions', validate({ body: permAssignSchema }), asyncHandler(roleController.assignPermissions));

/** DELETE /api/admin/system/roles/:id —— 删除角色 */
router.delete('/:id', asyncHandler(roleController.remove));

export default router;
