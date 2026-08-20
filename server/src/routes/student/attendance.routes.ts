import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import * as attendanceController from '../../controllers/student/attendance.controller';

const router = Router();

router.use(authMiddleware, studentOnly);

/** GET /api/student/attendance/record?startDate=&endDate=&page=&pageSize= —— 考勤记录 */
router.get('/record', asyncHandler(attendanceController.getRecords));

/** GET /api/student/attendance/statistics?startDate=&endDate= —— 缺勤统计 */
router.get('/statistics', asyncHandler(attendanceController.getStatistics));

export default router;
