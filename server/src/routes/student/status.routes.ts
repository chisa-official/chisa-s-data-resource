import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import { createUploader } from '../../shared/file/upload';
import * as statusController from '../../controllers/student/status.controller';

const router = Router();

const applySchema = z.object({
  type: z.enum(['SUSPEND', 'RESUME', 'TRANSFER_MAJOR', 'DROP_OUT']),
  reason: z.string().min(10, '请详细填写申请原因（至少 10 字）').max(500),
  targetMajorId: z.string().uuid().optional(),
});

const certificateSchema = z.object({
  type: z.enum(['ENROLLMENT', 'STATUS']),
  purpose: z.string().min(1, '请填写用途').max(200),
});

const attachmentUploader = createUploader({
  maxSizeMB: 5,
  allowedMime: ['image/jpeg', 'image/png', 'application/pdf'],
  maxCount: 1,
});

router.use(authMiddleware, studentOnly);

/** GET /api/student/status —— 当前学籍状态 */
router.get('/', asyncHandler(statusController.getStatus));

/** GET /api/student/status/majors —— 可选专业列表（转专业用） */
router.get('/majors', asyncHandler(statusController.getMajors));

/** GET /api/student/status/changes —— 异动申请记录 */
router.get('/changes', asyncHandler(statusController.listChanges));

/** POST /api/student/status/apply —— 提交异动申请（含附件） */
router.post('/apply', attachmentUploader.single('attachment'), validate({ body: applySchema }), asyncHandler(statusController.applyChange));

/** GET /api/student/status/certificates —— 证明申请记录 */
router.get('/certificates', asyncHandler(statusController.listCertificates));

/** POST /api/student/status/certificate —— 申请证明 */
router.post('/certificate', validate({ body: certificateSchema }), asyncHandler(statusController.applyCertificate));

/** GET /api/student/status/certificate/:id/download —— 下载证明 PDF */
router.get('/certificate/:id/download', asyncHandler(statusController.downloadCertificate));

export default router;
