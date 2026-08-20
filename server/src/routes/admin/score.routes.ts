import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import { createUploader } from '../../shared/file/upload';
import * as scoreController from '../../controllers/admin/score.controller';

const router = Router();
const excelUploader = createUploader({
  maxSizeMB: 5,
  allowedMime: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
});

router.use(authMiddleware, adminOnly);

const updateSchema = z.object({
  usualScore: z.number().min(0).max(100).optional(),
  examScore: z.number().min(0).max(100).optional(),
  finalScore: z.number().min(0).max(100).optional(),
  retake: z.boolean().optional(),
});

const auditBatchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

/** GET /api/admin/scores —— 成绩列表 */
router.get('/', asyncHandler(scoreController.list));

/** GET /api/admin/scores/calculate-gpa —— 触发绩点计算 */
router.get('/calculate-gpa', asyncHandler(scoreController.calculateGpa));

/** GET /api/admin/scores/template —— 下载成绩录入模板 */
router.get('/template', asyncHandler(scoreController.exportTemplate));

/** POST /api/admin/scores/import —— Excel 批量录入 */
router.post('/import', excelUploader.single('file'), asyncHandler(scoreController.importExcel));

/** PUT /api/admin/scores/audit-batch —— 批量审核 */
router.put('/audit-batch', validate({ body: auditBatchSchema }), asyncHandler(scoreController.auditBatch));

/** PUT /api/admin/scores/:id —— 修改单条成绩 */
router.put('/:id', validate({ body: updateSchema }), asyncHandler(scoreController.update));

/** PUT /api/admin/scores/:id/audit —— 审核通过 */
router.put('/:id/audit', asyncHandler(scoreController.audit));

/** PUT /api/admin/scores/:id/reject —— 打回重录 */
router.put('/:id/reject', asyncHandler(scoreController.reject));

export default router;
