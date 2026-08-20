import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as statusController from '../../controllers/admin/status.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

const graduationSchema = z.object({
  result: z.enum(['GRADUATED', 'COMPLETED', 'LEFT']),
});

const batchGraduationSchema = z.object({
  studentIds: z.array(z.string().uuid()).min(1, '至少选择一名学生'),
  result: z.enum(['GRADUATED', 'COMPLETED', 'LEFT']),
});

// ========== 学籍异动审批 ==========

/** GET /api/admin/status/changes —— 异动申请列表 */
router.get('/changes', asyncHandler(statusController.listStatusChanges));

/** PUT /api/admin/status/changes/:id/approve —— 审批通过 */
router.put('/changes/:id/approve', asyncHandler(statusController.approveStatusChange));

/** PUT /api/admin/status/changes/:id/reject —— 驳回 */
router.put('/changes/:id/reject', asyncHandler(statusController.rejectStatusChange));

// ========== 信息修改审批 ==========

/** GET /api/admin/status/info-edits —— 信息修改申请列表 */
router.get('/info-edits', asyncHandler(statusController.listInfoEdits));

/** PUT /api/admin/status/info-edits/:id/approve —— 审批通过 */
router.put('/info-edits/:id/approve', asyncHandler(statusController.approveInfoEdit));

/** PUT /api/admin/status/info-edits/:id/reject —— 驳回 */
router.put('/info-edits/:id/reject', asyncHandler(statusController.rejectInfoEdit));

// ========== 证明申请 ==========

/** GET /api/admin/status/certificates —— 证明申请列表 */
router.get('/certificates', asyncHandler(statusController.listCertificates));

/** PUT /api/admin/status/certificates/:id/generate —— 生成 PDF */
router.put('/certificates/:id/generate', asyncHandler(statusController.generateCertificate));

// ========== 毕业审核 ==========

/** GET /api/admin/graduation/audit —— 毕业审核列表 */
router.get('/graduation/audit', asyncHandler(statusController.graduationAuditList));

/** PUT /api/admin/graduation/:studentId —— 登记毕业/结业/肄业 */
router.put('/graduation/:studentId', validate({ body: graduationSchema }), asyncHandler(statusController.registerGraduation));

/** PUT /api/admin/graduation/batch —— 批量毕业登记 */
router.put('/graduation/batch', validate({ body: batchGraduationSchema }), asyncHandler(statusController.batchRegisterGraduation));

export default router;
