import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import * as dormController from '../../controllers/student/dorm.controller';

const router = Router();

const transferSchema = z.object({
  reason: z.string().min(1, '调宿原因不能为空').max(300, '原因不超过 300 字'),
  preferredDorm: z.string().optional(),
});

const checkoutSchema = z.object({
  reason: z.string().min(1, '退宿原因不能为空').max(300, '原因不超过 300 字'),
});

router.use(authMiddleware, studentOnly);

/** GET /api/student/dorm —— 我的宿舍信息、床位 */
router.get('/', asyncHandler(dormController.getMyDorm));

/** GET /api/student/dorm/inspection —— 卫生检查结果 */
router.get('/inspection', asyncHandler(dormController.getInspections));

/** GET /api/student/dorm/violation —— 宿舍违纪通报 */
router.get('/violation', asyncHandler(dormController.getViolations));

/** POST /api/student/dorm/transfer —— 调宿申请 */
router.post('/transfer', validate({ body: transferSchema }), asyncHandler(dormController.applyTransfer));

/** POST /api/student/dorm/checkout —— 退宿申请 */
router.post('/checkout', validate({ body: checkoutSchema }), asyncHandler(dormController.applyCheckout));

export default router;
