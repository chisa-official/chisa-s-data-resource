import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as reportController from '../../controllers/admin/report.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

/** GET /api/admin/dashboard/stats —— 工作台概览统计 */
router.get('/stats', asyncHandler(reportController.getDashboardStats));

export default router;
