import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as retakeController from '../../controllers/admin/retake.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

const registerSchema = z.object({
  scoreIds: z.array(z.string().uuid()).min(1, '至少选择一条记录'),
  semester: z.string().optional(),
});

const recordSchema = z.object({
  retakeScore: z.number().min(0).max(100),
});

const batchSchema = z.object({
  scoreIds: z.array(z.string().uuid()).min(1),
});

// ========== 重修管理 ==========

/** GET /api/admin/retake —— 重修名单（不及格成绩列表） */
router.get('/', asyncHandler(retakeController.listRetakes));

/** POST /api/admin/retake/register —— 批量报名重修 */
router.post('/register', validate({ body: registerSchema }), asyncHandler(retakeController.registerRetake));

// ========== 补考管理 ==========

/** GET /api/admin/retake/exam —— 补考名单 */
router.get('/exam', asyncHandler(retakeController.listExamRetakes));

/** POST /api/admin/retake/exam/batch —— 批量标记补考 */
router.post('/exam/batch', validate({ body: batchSchema }), asyncHandler(retakeController.batchMarkRetake));

/** PUT /api/admin/retake/exam/:id —— 录入补考成绩 */
router.put('/exam/:id', validate({ body: recordSchema }), asyncHandler(retakeController.recordExamRetakeScore));

export default router;
