import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { authMiddleware, studentOnly } from '../../shared/auth/middleware';
import * as noticeController from '../../controllers/student/notice.controller';

const router = Router();

router.use(authMiddleware, studentOnly);

/** GET /api/student/notice?scope=&page=&pageSize= —— 通知列表（按可见范围过滤） */
router.get('/', asyncHandler(noticeController.getNoticeList));

/** GET /api/student/notice/unread-count —— 未读数（需在 :id 之前注册） */
router.get('/unread-count', asyncHandler(noticeController.getUnreadCount));

/** GET /api/student/notice/:id —— 通知详情（自动标记已读） */
router.get('/:id', asyncHandler(noticeController.getNoticeDetail));

/** PUT /api/student/notice/:id/read —— 标记已读 */
router.put('/:id/read', asyncHandler(noticeController.markAsRead));

export default router;
