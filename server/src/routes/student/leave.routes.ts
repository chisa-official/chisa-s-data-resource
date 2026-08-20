import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import * as leaveController from '../../controllers/student/leave.controller';

const router = Router();

const applySchema = z.object({
  type: z.enum(['PERSONAL', 'SICK']),
  startDate: z.string().min(1, '开始时间不能为空'),
  endDate: z.string().min(1, '结束时间不能为空'),
  reason: z.string().min(1, '请假原因不能为空'),
  attachmentUrl: z.string().optional(),
});

router.use(authMiddleware, studentOnly);

/** POST /api/student/leave/apply —— 提交请假 */
router.post('/apply', validate({ body: applySchema }), asyncHandler(leaveController.applyLeave));

/** GET /api/student/leave/list?page=&pageSize= —— 请假记录及审批状态 */
router.get('/list', asyncHandler(leaveController.getLeaveList));

export default router;
