import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as selectionController from '../../controllers/admin/selection.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

const updatePeriodSchema = z.object({
  selectStart: z.string().optional().nullable(),
  selectEnd: z.string().optional().nullable(),
});

const toggleSchema = z.object({
  action: z.enum(['OPEN', 'CLOSE']),
  days: z.number().int().min(1).max(60).optional(),
});

/** GET /api/admin/selection/period —— 选课时间段列表 */
router.get('/period', asyncHandler(selectionController.listPeriods));

/** GET /api/admin/selection/list —— 选课记录列表 */
router.get('/list', asyncHandler(selectionController.list));

/** GET /api/admin/selection/statistics —— 选课统计 */
router.get('/statistics', asyncHandler(selectionController.statistics));

/** PUT /api/admin/selection/period/:courseId —— 更新选课时间段 */
router.put('/period/:courseId', validate({ body: updatePeriodSchema }), asyncHandler(selectionController.updatePeriod));

/** PUT /api/admin/selection/toggle/:courseId —— 一键开放/关闭选课 */
router.put('/toggle/:courseId', validate({ body: toggleSchema }), asyncHandler(selectionController.toggle));

/** PUT /api/admin/selection/:id/force-drop —— 管理员强制退选 */
router.put('/:id/force-drop', asyncHandler(selectionController.forceDrop));

export default router;
