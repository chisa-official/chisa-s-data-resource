import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as leaveService from '../../services/student/leave.service';
import { requireStudentId } from '../../middlewares/student';

/** POST /api/student/leave/apply —— 提交请假 */
export async function applyLeave(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { type, startDate, endDate, reason, attachmentUrl } = req.body;
  const data = await leaveService.createLeaveApply(studentId, {
    type,
    startDate,
    endDate,
    reason,
    attachmentUrl,
  });
  res.json(success(data, '请假申请提交成功'));
}

/** GET /api/student/leave/list?page=&pageSize= —— 请假记录及审批状态 */
export async function getLeaveList(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await leaveService.getLeaveList(studentId, req.query);
  res.json(success(data));
}
