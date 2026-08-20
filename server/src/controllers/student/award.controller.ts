import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as awardService from '../../services/student/award.service';
import { requireStudentId } from '../../middlewares/student';

/** GET /api/student/award?type=&page=&pageSize= —— 我的奖助记录列表 */
export async function getAwardList(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await awardService.getAwardList(studentId, req.query);
  res.json(success(data));
}

/** GET /api/student/award/applies?page=&pageSize= —— 我的申请列表及进度 */
export async function getAwardApplies(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await awardService.getAwardApplies(studentId, req.query);
  res.json(success(data));
}

/** POST /api/student/award/apply —— 创建奖助申请 */
export async function applyAward(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { type, name, amount, semester, attachments } = req.body;
  const data = await awardService.createAwardApply(studentId, {
    type,
    name,
    amount,
    semester,
    attachments,
  });
  res.json(success(data, '奖助申请提交成功'));
}
