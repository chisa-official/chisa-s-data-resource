import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as dormService from '../../services/student/dorm.service';
import { requireStudentId } from '../../middlewares/student';

/** GET /api/student/dorm —— 我的宿舍信息 */
export async function getMyDorm(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await dormService.getMyDorm(studentId);
  res.json(success(data));
}

/** GET /api/student/dorm/inspection —— 卫生检查结果 */
export async function getInspections(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await dormService.getInspections(studentId, req.query);
  res.json(success(data));
}

/** GET /api/student/dorm/violation —— 宿舍违纪通报 */
export async function getViolations(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await dormService.getViolations(studentId, req.query);
  res.json(success(data));
}

/** POST /api/student/dorm/transfer —— 调宿申请 */
export async function applyTransfer(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { reason, preferredDorm } = req.body;
  const data = await dormService.applyTransfer(studentId, { reason, preferredDorm });
  res.json(success(data, '调宿申请已提交'));
}

/** POST /api/student/dorm/checkout —— 退宿申请 */
export async function applyCheckout(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { reason } = req.body;
  const data = await dormService.applyCheckout(studentId, { reason });
  res.json(success(data, '退宿申请已提交'));
}
