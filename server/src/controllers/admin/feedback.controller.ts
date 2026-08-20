import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import * as feedbackService from '../../services/admin/feedback.service';

export async function listFeedbacks(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', type, status, studentNo, studentName } = req.query;
  const result = await feedbackService.listFeedbacks({
    page: Number(page),
    pageSize: Number(pageSize),
    type: type as any | undefined,
    status: status as any | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function getFeedback(req: Request, res: Response): Promise<void> {
  const result = await feedbackService.getFeedback(req.params.id);
  res.json(success(result));
}

export async function replyFeedback(req: Request, res: Response): Promise<void> {
  const result = await feedbackService.replyFeedback(req.params.id, req.body);
  res.json(success(result, '回复成功'));
}
