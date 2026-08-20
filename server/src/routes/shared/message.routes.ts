import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { success, pageResult, parsePagination } from '../../shared/response/response';
import { authMiddleware } from '../../shared/auth/middleware';
import {
  markRead,
  markAllRead,
  getUnreadCount,
} from '../../shared/message/in-app';
import { prisma } from '../../shared/utils/prisma';

const router = Router();

router.use(authMiddleware);

/** GET /api/shared/messages —— 站内消息列表（分页） */
router.get(
  '/',
  parsePagination,
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = req.pagination!;
    const where = {
      receiverId: req.user!.userId,
      receiverType: req.user!.userType,
      ...(req.query.isRead !== undefined ? { isRead: req.query.isRead === 'true' } : {}),
    };
    const [list, total] = await Promise.all([
      prisma.message.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      prisma.message.count({ where }),
    ]);
    res.json(success(pageResult(list, total, page, pageSize)));
  }),
);

/** GET /api/shared/messages/unread-count —— 未读数 */
router.get(
  '/unread-count',
  asyncHandler(async (req, res) => {
    const count = await getUnreadCount(req.user!.userId, req.user!.userType);
    res.json(success({ count }));
  }),
);

/** PUT /api/shared/messages/read-all —— 全部已读 */
router.put(
  '/read-all',
  asyncHandler(async (req, res) => {
    await markAllRead(req.user!.userId, req.user!.userType);
    res.json(success(null, '已全部标记为已读'));
  }),
);

/** PUT /api/shared/messages/:id/read —— 标记单条已读 */
router.put(
  '/:id/read',
  asyncHandler(async (req, res) => {
    await markRead(req.params.id, req.user!.userId);
    res.json(success(null, '已标记为已读'));
  }),
);

export default router;
