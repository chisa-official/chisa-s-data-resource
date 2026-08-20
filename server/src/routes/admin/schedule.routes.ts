import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as scheduleController from '../../controllers/admin/schedule.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

const createSchema = z.object({
  courseId: z.string().uuid(),
  classId: z.string().uuid(),
  weekDay: z.number().int().min(1).max(7),
  startSection: z.number().int().min(1),
  endSection: z.number().int().min(1),
  startWeek: z.number().int().min(1),
  endWeek: z.number().int().min(1),
  classroom: z.string().min(1, '教室不能为空'),
});

const updateSchema = createSchema.partial();

const publishSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
});

/** GET /api/admin/schedules —— 排课分页列表 */
router.get('/', asyncHandler(scheduleController.list));

/** GET /api/admin/schedules/all —— 全部排课（不分页，用于课表展示） */
router.get('/all', asyncHandler(scheduleController.listAll));

/** POST /api/admin/schedules —— 创建排课 */
router.post('/', validate({ body: createSchema }), asyncHandler(scheduleController.create));

/** PUT /api/admin/schedules/publish —— 课表发布 */
router.put('/publish', validate({ body: publishSchema }), asyncHandler(scheduleController.publish));

/** PUT /api/admin/schedules/:id —— 更新排课 */
router.put('/:id', validate({ body: updateSchema }), asyncHandler(scheduleController.update));

/** DELETE /api/admin/schedules/:id —— 删除排课 */
router.delete('/:id', asyncHandler(scheduleController.remove));

export default router;
