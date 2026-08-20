import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import * as awardController from '../../controllers/student/award.controller';

const router = Router();

const applySchema = z.object({
  type: z.enum(['SCHOLARSHIP', 'AID', 'LOAN', 'HONOR']),
  name: z.string().min(1, '项目名称不能为空'),
  amount: z.number().min(0).optional(),
  semester: z.string().min(1, '学期不能为空'),
  attachments: z.array(z.string()).optional(),
});

router.use(authMiddleware, studentOnly);

/** GET /api/student/award?type=&page=&pageSize= —— 我的奖助记录列表 */
router.get('/', asyncHandler(awardController.getAwardList));

/** GET /api/student/award/applies?page=&pageSize= —— 我的申请列表及进度 */
router.get('/applies', asyncHandler(awardController.getAwardApplies));

/** POST /api/student/award/apply —— 创建奖助申请 */
router.post('/apply', validate({ body: applySchema }), asyncHandler(awardController.applyAward));

export default router;
