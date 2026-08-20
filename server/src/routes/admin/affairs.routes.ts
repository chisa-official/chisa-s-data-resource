import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as affairsController from '../../controllers/admin/affairs.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

// ========== 请假审批 ==========

const leaveRejectSchema = z.object({
  reason: z.string().optional(),
});

/** GET /api/admin/affairs/leaves —— 请假申请列表 */
router.get('/leaves', asyncHandler(affairsController.listLeaves));

/** PUT /api/admin/affairs/leaves/:id/approve —— 审批通过（当前节点） */
router.put('/leaves/:id/approve', asyncHandler(affairsController.approveLeave));

/** PUT /api/admin/affairs/leaves/:id/forward —— 转交下一级 */
router.put('/leaves/:id/forward', asyncHandler(affairsController.forwardLeave));

/** PUT /api/admin/affairs/leaves/:id/reject —— 驳回 */
router.put('/leaves/:id/reject', validate({ body: leaveRejectSchema }), asyncHandler(affairsController.rejectLeave));

// ========== 奖助贷项目 ==========

const projectSchema = z.object({
  name: z.string().min(1, '项目名称不能为空'),
  awardType: z.enum(['SCHOLARSHIP', 'AID', 'LOAN', 'HONOR']),
  amount: z.number().min(0).optional(),
  description: z.string().optional(),
  sort: z.number().int().optional(),
});

const projectUpdateSchema = projectSchema.partial();

/** GET /api/admin/affairs/awards/projects —— 奖助项目列表 */
router.get('/awards/projects', asyncHandler(affairsController.listAwardProjects));

/** POST /api/admin/affairs/awards/projects —— 创建奖助项目 */
router.post('/awards/projects', validate({ body: projectSchema }), asyncHandler(affairsController.createAwardProject));

/** PUT /api/admin/affairs/awards/projects/:id —— 更新奖助项目 */
router.put('/awards/projects/:id', validate({ body: projectUpdateSchema }), asyncHandler(affairsController.updateAwardProject));

/** DELETE /api/admin/affairs/awards/projects/:id —— 删除奖助项目 */
router.delete('/awards/projects/:id', asyncHandler(affairsController.deleteAwardProject));

// ========== 奖助申请审核 ==========

const auditSchema = z.object({
  passed: z.boolean(),
  result: z.string().optional(),
});

const batchPublishSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, '至少选择一条记录'),
});

/** GET /api/admin/affairs/awards/applies —— 奖助申请列表 */
router.get('/awards/applies', asyncHandler(affairsController.listAwardApplies));

/** PUT /api/admin/affairs/awards/:id/audit —— 材料审核 */
router.put('/awards/:id/audit', validate({ body: auditSchema }), asyncHandler(affairsController.auditAward));

/** PUT /api/admin/affairs/awards/:id/publish —— 名单公示 */
router.put('/awards/:id/publish', asyncHandler(affairsController.publishAward));

/** PUT /api/admin/affairs/awards/batch-publish —— 批量公示 */
router.put('/awards/batch-publish', validate({ body: batchPublishSchema }), asyncHandler(affairsController.batchPublishAward));

// ========== 违纪处分 ==========

const disciplineSchema = z.object({
  studentId: z.string().uuid(),
  type: z.enum(['WARNING', 'SERIOUS_WARNING', 'DEMERIT', 'EXPEL']),
  reason: z.string().min(1, '违纪原因不能为空'),
  occurredAt: z.string().min(1, '违纪时间不能为空'),
});

const disciplineUpdateSchema = disciplineSchema.partial();

/** GET /api/admin/affairs/disciplines —— 违纪记录列表 */
router.get('/disciplines', asyncHandler(affairsController.listDisciplines));

/** POST /api/admin/affairs/disciplines —— 录入违纪 */
router.post('/disciplines', validate({ body: disciplineSchema }), asyncHandler(affairsController.createDiscipline));

/** PUT /api/admin/affairs/disciplines/:id —— 更新违纪记录 */
router.put('/disciplines/:id', validate({ body: disciplineUpdateSchema }), asyncHandler(affairsController.updateDiscipline));

/** DELETE /api/admin/affairs/disciplines/:id —— 删除违纪记录 */
router.delete('/disciplines/:id', asyncHandler(affairsController.deleteDiscipline));

// ========== 评优评先 ==========

const honorSchema = z.object({
  studentId: z.string().uuid(),
  name: z.string().min(1, '荣誉名称不能为空'),
  semester: z.string().min(1, '学期不能为空'),
  result: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

const honorAuditSchema = z.object({
  passed: z.boolean(),
  result: z.string().optional(),
});

/** GET /api/admin/affairs/honors —— 评优荣誉列表 */
router.get('/honors', asyncHandler(affairsController.listHonors));

/** POST /api/admin/affairs/honors —— 授予荣誉 */
router.post('/honors', validate({ body: honorSchema }), asyncHandler(affairsController.grantHonor));

/** PUT /api/admin/affairs/honors/:id/audit —— 荣誉审核 */
router.put('/honors/:id/audit', validate({ body: honorAuditSchema }), asyncHandler(affairsController.auditHonor));

export default router;
