import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as feedbackService from '../../services/student/feedback.service';
import { requireStudentId } from '../../middlewares/student';

/** POST /api/student/repair —— 提交报修 */
export async function createRepair(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { type, location, description, images } = req.body;
  const data = await feedbackService.createRepair(studentId, { type, location, description, images });
  res.json(success(data, '报修提交成功'));
}

/** GET /api/student/repair —— 我的报修记录 */
export async function getRepairList(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await feedbackService.getRepairList(studentId, req.query);
  res.json(success(data));
}

/** POST /api/student/feedback —— 提交意见/投诉 */
export async function createFeedback(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { type, content } = req.body;
  const data = await feedbackService.createFeedback(studentId, { type, content });
  res.json(success(data, '反馈提交成功'));
}

/** GET /api/student/feedback —— 我的反馈及回复 */
export async function getFeedbackList(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await feedbackService.getFeedbackList(studentId, req.query);
  res.json(success(data));
}
