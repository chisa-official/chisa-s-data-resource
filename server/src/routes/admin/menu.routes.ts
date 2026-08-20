import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as menuController from '../../controllers/admin/menu.controller';

const router = Router();

const createSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, '菜单名称不能为空'),
  path: z.string().optional(),
  component: z.string().optional(),
  icon: z.string().optional(),
  sort: z.number().int().optional(),
  type: z.enum(['DIRECTORY', 'MENU', 'BUTTON']),
  permission: z.string().optional(),
  visible: z.boolean().optional(),
});

const updateSchema = z.object({
  parentId: z.string().uuid().optional().nullable(),
  name: z.string().min(1).optional(),
  path: z.string().optional(),
  component: z.string().optional(),
  icon: z.string().optional(),
  sort: z.number().int().optional(),
  type: z.enum(['DIRECTORY', 'MENU', 'BUTTON']).optional(),
  permission: z.string().optional(),
  visible: z.boolean().optional(),
});

router.use(authMiddleware, adminOnly);

/** GET /api/admin/system/menus —— 菜单树 */
router.get('/', asyncHandler(menuController.tree));

/** GET /api/admin/system/menus/list —— 菜单扁平列表 */
router.get('/list', asyncHandler(menuController.list));

/** POST /api/admin/system/menus —— 创建菜单 */
router.post('/', validate({ body: createSchema }), asyncHandler(menuController.create));

/** PUT /api/admin/system/menus/:id —— 更新菜单 */
router.put('/:id', validate({ body: updateSchema }), asyncHandler(menuController.update));

/** DELETE /api/admin/system/menus/:id —— 删除菜单 */
router.delete('/:id', asyncHandler(menuController.remove));

export default router;
