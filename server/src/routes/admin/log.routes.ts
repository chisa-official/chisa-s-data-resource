import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as logController from '../../controllers/admin/log.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

/** GET /api/admin/system/logs/login —— 登录日志 */
router.get('/login', asyncHandler(logController.loginLogs));

/** GET /api/admin/system/logs/operation —— 操作日志 */
router.get('/operation', asyncHandler(logController.operationLogs));

export default router;
