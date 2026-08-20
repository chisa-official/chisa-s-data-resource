import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import * as feedbackController from '../../controllers/student/feedback.controller';

const router = Router();

const repairSchema = z.object({
  type: z.enum(['DORM', 'CLASSROOM']),
  location: z.string().min(1, '报修位置不能为空').max(100, '位置描述不超过 100 字'),
  description: z.string().min(1, '报修描述不能为空').max(500, '描述不超过 500 字'),
  images: z.array(z.string()).optional(),
});

const feedbackSchema = z.object({
  type: z.enum(['SUGGESTION', 'COMPLAINT']),
  content: z.string().min(1, '反馈内容不能为空').max(500, '内容不超过 500 字'),
});

router.use(authMiddleware, studentOnly);

/** POST /api/student/repair —— 提交报修（多图上传） */
router.post('/repair', validate({ body: repairSchema }), asyncHandler(feedbackController.createRepair));

/** GET /api/student/repair —— 我的报修记录及处理状态 */
router.get('/repair', asyncHandler(feedbackController.getRepairList));

/** POST /api/student/feedback —— 提交意见/投诉 */
router.post('/feedback', validate({ body: feedbackSchema }), asyncHandler(feedbackController.createFeedback));

/** GET /api/student/feedback —— 我的反馈及回复 */
router.get('/feedback', asyncHandler(feedbackController.getFeedbackList));

export default router;
