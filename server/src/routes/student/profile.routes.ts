import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import { createUploader } from '../../shared/file/upload';
import * as profileController from '../../controllers/student/profile.controller';

const router = Router();

const infoEditSchema = z.object({
  field: z.enum(['phone', 'email', 'hometown', 'address']),
  newValue: z.string().min(1, '新值不能为空').max(200),
});

const passwordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6, '密码长度 6-20 位').max(20, '密码长度 6-20 位'),
});

const avatarUploader = createUploader({
  maxSizeMB: 2,
  allowedMime: ['image/jpeg', 'image/png'],
  maxCount: 1,
});

router.use(authMiddleware, studentOnly);

/** GET /api/student/profile —— 获取个人档案 */
router.get('/', asyncHandler(profileController.getProfile));

/** PUT /api/student/profile/info-edit —— 提交信息修改申请 */
router.put('/info-edit', validate({ body: infoEditSchema }), asyncHandler(profileController.submitInfoEdit));

/** GET /api/student/profile/info-edits —— 修改申请记录 */
router.get('/info-edits', asyncHandler(profileController.listInfoEdits));

/** PUT /api/student/profile/password —— 修改密码 */
router.put('/password', validate({ body: passwordSchema }), asyncHandler(profileController.changePassword));

/** POST /api/student/profile/avatar —— 上传头像 */
router.post('/avatar', avatarUploader.single('file'), asyncHandler(profileController.uploadAvatar));

export default router;
