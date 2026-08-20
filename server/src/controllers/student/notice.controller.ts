import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as noticeService from '../../services/student/notice.service';
import { requireStudentId } from '../../middlewares/student';
import { ApiError } from '../../shared/error/ApiError';

/** GET /api/student/notice?scope=&page=&pageSize= —— 通知列表 */
export async function getNoticeList(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await noticeService.getNoticeList(studentId, req.query);
  res.json(success(data));
}

/** GET /api/student/notice/unread-count —— 未读数 */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await noticeService.getUnreadCount(studentId);
  res.json(success(data));
}

/** GET /api/student/notice/:id —— 通知详情（自动标记已读） */
export async function getNoticeDetail(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await noticeService.getNoticeDetail(studentId, req.params.id);
  if (!data) throw ApiError.notFound('通知不存在或您无权查看');
  res.json(success(data));
}

/** PUT /api/student/notice/:id/read —— 标记已读 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  await noticeService.markAsRead(studentId, req.params.id);
  res.json(success(null, '已标记为已读'));
}
