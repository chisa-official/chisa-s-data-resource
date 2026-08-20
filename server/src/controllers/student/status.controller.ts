import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as statusService from '../../services/student/status.service';
import { requireStudentId } from '../../middlewares/student';

/** GET /api/student/status */
export async function getStatus(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await statusService.getCurrentStatus(studentId);
  res.json(success(data));
}

/** GET /api/student/status/majors —— 可选专业列表（转专业用，排除学生当前院系） */
export async function getMajors(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const data = await statusService.getMajorsForStudent(studentId);
  res.json(success(data));
}

/** GET /api/student/status/changes */
export async function listChanges(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const data = await statusService.listStatusChanges(studentId, page, pageSize);
  res.json(success(data));
}

/** POST /api/student/status/apply —— multipart/form-data */
export async function applyChange(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { type, reason, targetMajorId } = req.body;
  const file = req.file;
  const data = await statusService.applyStatusChange(studentId, type, reason, file, targetMajorId);
  res.json(success(data, '异动申请已提交'));
}

/** GET /api/student/status/certificates */
export async function listCertificates(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 10;
  const data = await statusService.listCertificates(studentId, page, pageSize);
  res.json(success(data));
}

/** POST /api/student/status/certificate */
export async function applyCertificate(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { type, purpose } = req.body;
  const data = await statusService.applyCertificate(studentId, type, purpose);
  res.json(success(data, '证明已生成'));
}

/** GET /api/student/status/certificate/:id/download */
export async function downloadCertificate(req: Request, res: Response): Promise<void> {
  const studentId = requireStudentId(req);
  const { buffer, filename } = await statusService.downloadCertificate(studentId, req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
}
