import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as reportController from '../../controllers/admin/report.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

// ========== 报表统计（任务书02 模块9） ==========

/** GET /api/admin/report/student-count —— 学生人数统计（按院系/性别/年级/状态） */
router.get('/student-count', asyncHandler(reportController.getStudentCount));

/** GET /api/admin/report/status-change —— 学籍异动统计（按月趋势/类型） */
router.get('/status-change', asyncHandler(reportController.getStatusChange));

/** GET /api/admin/report/attendance —— 考勤统计（按班级出勤率） */
router.get('/attendance', asyncHandler(reportController.getAttendance));

/** GET /api/admin/report/award —— 奖助学金统计（按类型/院系） */
router.get('/award', asyncHandler(reportController.getAward));

/** GET /api/admin/report/discipline —— 违纪统计（按类型/院系） */
router.get('/discipline', asyncHandler(reportController.getDiscipline));

/** GET /api/admin/report/export?type=&format= —— 导出报表（Excel/PDF） */
router.get('/export', asyncHandler(reportController.exportReportFile));

export default router;
