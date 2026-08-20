import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import { requireAdminId } from '../../middlewares/admin';
import * as statusService from '../../services/admin/status.service';

// ========== 学籍异动审批 ==========

export async function listStatusChanges(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', status, type, studentNo, studentName } = req.query;
  const result = await statusService.listStatusChanges({
    page: Number(page),
    pageSize: Number(pageSize),
    status: status as any | undefined,
    type: type as any | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function approveStatusChange(req: Request, res: Response): Promise<void> {
  const reviewerId = requireAdminId(req);
  const result = await statusService.approveStatusChange(req.params.id, reviewerId);
  res.json(success(result, '审批通过'));
}

export async function rejectStatusChange(req: Request, res: Response): Promise<void> {
  const reviewerId = requireAdminId(req);
  const result = await statusService.rejectStatusChange(req.params.id, reviewerId, req.body.reason);
  res.json(success(result, '已驳回'));
}

// ========== 信息修改审批 ==========

export async function listInfoEdits(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', status, studentNo, studentName } = req.query;
  const result = await statusService.listInfoEdits({
    page: Number(page),
    pageSize: Number(pageSize),
    status: status as any | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function approveInfoEdit(req: Request, res: Response): Promise<void> {
  const reviewerId = requireAdminId(req);
  const result = await statusService.approveInfoEdit(req.params.id, reviewerId);
  res.json(success(result, '审批通过'));
}

export async function rejectInfoEdit(req: Request, res: Response): Promise<void> {
  const reviewerId = requireAdminId(req);
  const result = await statusService.rejectInfoEdit(req.params.id, reviewerId);
  res.json(success(result, '已驳回'));
}

// ========== 证明申请 ==========

export async function listCertificates(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', status, type, studentNo, studentName } = req.query;
  const result = await statusService.listCertificates({
    page: Number(page),
    pageSize: Number(pageSize),
    status: status as any | undefined,
    type: type as any | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function generateCertificate(req: Request, res: Response): Promise<void> {
  const result = await statusService.generateCertificatePdf(req.params.id);
  res.json(success(result, 'PDF 已生成'));
}

// ========== 毕业审核 ==========

export async function graduationAuditList(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', departmentId, classId, studentNo, name } = req.query;
  const result = await statusService.graduationAuditList({
    page: Number(page),
    pageSize: Number(pageSize),
    departmentId: departmentId as string | undefined,
    classId: classId as string | undefined,
    studentNo: studentNo as string | undefined,
    name: name as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function registerGraduation(req: Request, res: Response): Promise<void> {
  const result = await statusService.registerGraduation(req.params.studentId, req.body.result);
  res.json(success(result, '毕业登记成功'));
}

export async function batchRegisterGraduation(req: Request, res: Response): Promise<void> {
  const result = await statusService.batchRegisterGraduation(req.body.studentIds, req.body.result);
  res.json(success(result, `已登记 ${result.count} 名学生`));
}
