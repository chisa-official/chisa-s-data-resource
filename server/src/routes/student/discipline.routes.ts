import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import * as disciplineController from '../../controllers/student/discipline.controller';

const router = Router();

router.use(authMiddleware, studentOnly);

/** GET /api/student/discipline —— 我的违纪记录（只读） */
router.get('/', asyncHandler(disciplineController.getDisciplineList));

export default router;
