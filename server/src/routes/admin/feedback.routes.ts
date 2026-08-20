import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as feedbackController from '../../controllers/admin/feedback.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

const replySchema = z.object({
  reply: z.string().min(1, '回复内容不能为空'),
});

/** GET /api/admin/feedbacks —— 反馈列表 */
router.get('/', asyncHandler(feedbackController.listFeedbacks));

/** GET /api/admin/feedbacks/:id —— 反馈详情 */
router.get('/:id', asyncHandler(feedbackController.getFeedback));

/** PUT /api/admin/feedbacks/:id/reply —— 回复反馈 */
router.put('/:id/reply', validate({ body: replySchema }), asyncHandler(feedbackController.replyFeedback));

export default router;
