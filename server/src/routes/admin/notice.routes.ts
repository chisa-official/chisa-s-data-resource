import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../shared/error/handler';
import { validate } from '../../shared/validate/zod';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import * as noticeController from '../../controllers/admin/notice.controller';

const router = Router();

router.use(authMiddleware, adminOnly);

// ========== 通知 CRUD ==========

const noticeSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  content: z.string().min(1, '内容不能为空'),
  scope: z.enum(['SCHOOL', 'DEPARTMENT', 'CLASS']),
  targetId: z.string().optional(),
  attachments: z.array(z.string()).optional(),
  publishAt: z.string().optional(),
});

const noticeUpdateSchema = noticeSchema.partial();

/** GET /api/admin/notices —— 通知列表 */
router.get('/', asyncHandler(noticeController.listNotices));

/** POST /api/admin/notices —— 创建通知 */
router.post('/', validate({ body: noticeSchema }), asyncHandler(noticeController.createNotice));

/** GET /api/admin/notices/:id —— 通知详情 */
router.get('/:id', asyncHandler(noticeController.getNotice));

/** PUT /api/admin/notices/:id —— 更新通知 */
router.put('/:id', validate({ body: noticeUpdateSchema }), asyncHandler(noticeController.updateNotice));

/** DELETE /api/admin/notices/:id —— 删除通知 */
router.delete('/:id', asyncHandler(noticeController.deleteNotice));

/** PUT /api/admin/notices/:id/publish —— 发布通知 */
router.put('/:id/publish', asyncHandler(noticeController.publishNotice));

/** GET /api/admin/notices/:id/read-stats —— 阅读统计 */
router.get('/:id/read-stats', asyncHandler(noticeController.getReadStats));

/** GET /api/admin/notices/:id/readers —— 已读/未读学生列表 */
router.get('/:id/readers', asyncHandler(noticeController.getReaders));

export default router;
