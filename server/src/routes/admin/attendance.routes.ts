import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as attendanceController from '../../controllers/admin/attendance.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

const importSchema = z.object({
  items: z.array(z.object({
    studentNo: z.string().min(1),
    courseId: z.string().uuid(),
    scheduleId: z.string().min(1),
    date: z.string().min(1),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']),
  })).min(1, '考勤数据不能为空'),
});

const ruleSchema = z.object({
  threshold: z.number().int().min(1, '预警阈值必须大于 0'),
  notifyRole: z.string().min(1, '通知角色不能为空'),
});

// ========== 考勤录入 ==========

/** POST /api/admin/attendance/import —— 批量录入考勤 */
router.post('/import', validate({ body: importSchema }), asyncHandler(attendanceController.importAttendance));

// ========== 考勤记录查询 ==========

/** GET /api/admin/attendance/list —— 考勤记录列表 */
router.get('/list', asyncHandler(attendanceController.listAttendance));

// ========== 考勤统计 ==========

/** GET /api/admin/attendance/statistics —— 考勤统计（按班级聚合） */
router.get('/statistics', asyncHandler(attendanceController.getStatistics));

// ========== 考勤预警 ==========

/** GET /api/admin/attendance/warning —— 预警名单 */
router.get('/warning', asyncHandler(attendanceController.getWarnings));

// ========== 预警规则配置 ==========

/** GET /api/admin/attendance/rules —— 预警规则 */
router.get('/rules', asyncHandler(attendanceController.getRule));

/** PUT /api/admin/attendance/rules —— 更新预警规则 */
router.put('/rules', validate({ body: ruleSchema }), asyncHandler(attendanceController.updateRule));

export default router;
