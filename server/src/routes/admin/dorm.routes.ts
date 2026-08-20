import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as dormController from '../../controllers/admin/dorm.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

// ========== 宿舍/床位管理 ==========

const dormSchema = z.object({
  building: z.string().min(1, '楼栋不能为空'),
  roomNo: z.string().min(1, '房间号不能为空'),
  capacity: z.number().int().min(1, '容量不能小于1'),
  gender: z.enum(['MALE', 'FEMALE']),
  beds: z.array(z.string().min(1)).min(1, '至少一个床位'),
});

const dormUpdateSchema = dormSchema.partial();

/** GET /api/admin/dorms —— 宿舍列表 */
router.get('/', asyncHandler(dormController.listDorms));

/** POST /api/admin/dorms —— 创建宿舍 */
router.post('/', validate({ body: dormSchema }), asyncHandler(dormController.createDorm));

// ========== 入住分配 / 调宿 / 退宿（静态路径，置于 /:id 之前避免冲突） ==========

const assignSchema = z.object({
  studentId: z.string().uuid(),
  dormId: z.string().uuid(),
  bedNo: z.string().min(1),
  moveInDate: z.string().optional(),
});

const transferSchema = z.object({
  studentId: z.string().uuid(),
  dormId: z.string().uuid(),
  bedNo: z.string().min(1),
});

const checkoutSchema = z.object({
  studentId: z.string().uuid(),
});

/** GET /api/admin/dorms/assignments —— 在住学生列表 */
router.get('/assignments', asyncHandler(dormController.listAssignments));

/** POST /api/admin/dorms/assign —— 分配入住 */
router.post('/assign', validate({ body: assignSchema }), asyncHandler(dormController.assignDorm));

/** PUT /api/admin/dorms/transfer —— 调宿办理 */
router.put('/transfer', validate({ body: transferSchema }), asyncHandler(dormController.transferDorm));

/** PUT /api/admin/dorms/checkout —— 退宿办理 */
router.put('/checkout', validate({ body: checkoutSchema }), asyncHandler(dormController.checkoutDorm));

// ========== 卫生检查 ==========

const inspectionSchema = z.object({
  dormId: z.string().uuid(),
  score: z.number().int().min(0).max(100),
  issues: z.string().optional(),
  inspectedAt: z.string().min(1, '检查时间不能为空'),
});

const inspectionUpdateSchema = z.object({
  score: z.number().int().min(0).max(100).optional(),
  issues: z.string().optional(),
  inspectedAt: z.string().optional(),
});

/** GET /api/admin/dorms/inspections —— 检查记录列表 */
router.get('/inspections', asyncHandler(dormController.listInspections));

/** POST /api/admin/dorms/inspections —— 登记检查 */
router.post('/inspections', validate({ body: inspectionSchema }), asyncHandler(dormController.createInspection));

/** PUT /api/admin/dorms/inspections/:id —— 更新检查记录 */
router.put('/inspections/:id', validate({ body: inspectionUpdateSchema }), asyncHandler(dormController.updateInspection));

/** DELETE /api/admin/dorms/inspections/:id —— 删除检查记录 */
router.delete('/inspections/:id', asyncHandler(dormController.deleteInspection));

// ========== 宿舍违纪 ==========

const violationSchema = z.object({
  dormId: z.string().uuid(),
  studentId: z.string().uuid().optional(),
  type: z.string().min(1, '违纪类型不能为空'),
  description: z.string().min(1, '违纪描述不能为空'),
  occurredAt: z.string().min(1, '违纪时间不能为空'),
});

const violationUpdateSchema = z.object({
  type: z.string().optional(),
  description: z.string().optional(),
  occurredAt: z.string().optional(),
});

/** GET /api/admin/dorms/violations —— 违纪记录列表 */
router.get('/violations', asyncHandler(dormController.listViolations));

/** POST /api/admin/dorms/violations —— 登记违纪 */
router.post('/violations', validate({ body: violationSchema }), asyncHandler(dormController.createViolation));

/** PUT /api/admin/dorms/violations/:id —— 更新违纪记录 */
router.put('/violations/:id', validate({ body: violationUpdateSchema }), asyncHandler(dormController.updateViolation));

/** DELETE /api/admin/dorms/violations/:id —— 删除违纪记录 */
router.delete('/violations/:id', asyncHandler(dormController.deleteViolation));

// ========== 报修工单处理 ==========

const handleRepairSchema = z.object({
  status: z.enum(['PROCESSING', 'DONE']),
  result: z.string().optional(),
});

/** GET /api/admin/dorms/repairs —— 报修工单列表 */
router.get('/repairs', asyncHandler(dormController.listRepairs));

/** PUT /api/admin/dorms/repairs/:id —— 处理报修工单 */
router.put('/repairs/:id', validate({ body: handleRepairSchema }), asyncHandler(dormController.handleRepair));

// ========== 带参数 /:id 路由（最后注册，避免与静态路径冲突） ==========

/** GET /api/admin/dorms/:id/beds —— 床位入住详情 */
router.get('/:id/beds', asyncHandler(dormController.getDormBeds));

/** PUT /api/admin/dorms/:id —— 更新宿舍 */
router.put('/:id', validate({ body: dormUpdateSchema }), asyncHandler(dormController.updateDorm));

/** DELETE /api/admin/dorms/:id —— 删除宿舍 */
router.delete('/:id', asyncHandler(dormController.deleteDorm));

export default router;
