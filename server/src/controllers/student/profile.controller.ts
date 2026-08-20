import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as profileService from '../../services/student/profile.service';
import { requireStudentId } from '../../middlewares/student';

/** GET /api/student/profile */
export async function getProfile(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await profileService.getProfile(studentId);
  res.json(success(data));
}

/** PUT /api/student/profile/info-edit */
export async function submitInfoEdit(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { field, newValue } = req.body;
  const data = await profileService.submitInfoEdit(studentId, field, newValue);
  res.json(success(data, '申请已提交'));
}

/** GET /api/student/profile/info-edits */
export async function listInfoEdits(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const data = await profileService.listInfoEdits(studentId, page, pageSize);
  res.json(success(data));
}

/** PUT /api/student/profile/password */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { oldPassword, newPassword } = req.body;
  await profileService.changePassword(studentId, oldPassword, newPassword);
  res.json(success(null, '密码修改成功'));
}

/** POST /api/student/profile/avatar */
export async function uploadAvatar(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const file = req.file!;
  const url = await profileService.uploadAvatar(studentId, file);
  res.json(success({ url }, '头像上传成功'));
}
