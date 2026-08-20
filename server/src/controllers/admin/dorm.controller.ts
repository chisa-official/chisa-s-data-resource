import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import { requireAdminId } from '../../middlewares/admin';
import * as dormService from '../../services/admin/dorm.service';

// ========== 宿舍/床位管理 ==========

export async function listDorms(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', building, roomNo, gender } = req.query;
  const result = await dormService.listDorms({
    page: Number(page),
    pageSize: Number(pageSize),
    building: building as string | undefined,
    roomNo: roomNo as string | undefined,
    gender: gender as any | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function getDormBeds(req: Request, res: Response): Promise<void> {
  const result = await dormService.getDormBeds(req.params.id);
  res.json(success(result));
}

export async function createDorm(req: Request, res: Response): Promise<void> {
  const result = await dormService.createDorm(req.body);
  res.json(success(result, '宿舍创建成功'));
}

export async function updateDorm(req: Request, res: Response): Promise<void> {
  const result = await dormService.updateDorm(req.params.id, req.body);
  res.json(success(result, '宿舍更新成功'));
}

export async function deleteDorm(req: Request, res: Response): Promise<void> {
  await dormService.deleteDorm(req.params.id);
  res.json(success(null, '宿舍已删除'));
}

// ========== 入住分配 / 调宿 / 退宿 ==========

export async function listAssignments(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', dormId, building, studentNo, studentName, status } = req.query;
  const result = await dormService.listAssignments({
    page: Number(page),
    pageSize: Number(pageSize),
    dormId: dormId as string | undefined,
    building: building as string | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
    status: status as any | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function assignDorm(req: Request, res: Response): Promise<void> {
  const result = await dormService.assignDorm(req.body);
  res.json(success(result, '入住分配成功'));
}

export async function transferDorm(req: Request, res: Response): Promise<void> {
  const result = await dormService.transferDorm(req.body);
  res.json(success(result, '调宿办理成功'));
}

export async function checkoutDorm(req: Request, res: Response): Promise<void> {
  const result = await dormService.checkoutDorm(req.body);
  res.json(success(result, '退宿办理成功'));
}

// ========== 卫生检查 ==========

export async function listInspections(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', dormId, building } = req.query;
  const result = await dormService.listInspections({
    page: Number(page),
    pageSize: Number(pageSize),
    dormId: dormId as string | undefined,
    building: building as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function createInspection(req: Request, res: Response): Promise<void> {
  const inspectorId = requireAdminId(req);
  const result = await dormService.createInspection({ ...req.body, inspectorId });
  res.json(success(result, '检查登记成功'));
}

export async function updateInspection(req: Request, res: Response): Promise<void> {
  const result = await dormService.updateInspection(req.params.id, req.body);
  res.json(success(result, '检查记录已更新'));
}

export async function deleteInspection(req: Request, res: Response): Promise<void> {
  await dormService.deleteInspection(req.params.id);
  res.json(success(null, '检查记录已删除'));
}

// ========== 宿舍违纪 ==========

export async function listViolations(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', dormId, building, studentNo, studentName } = req.query;
  const result = await dormService.listViolations({
    page: Number(page),
    pageSize: Number(pageSize),
    dormId: dormId as string | undefined,
    building: building as string | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function createViolation(req: Request, res: Response): Promise<void> {
  const result = await dormService.createViolation(req.body);
  res.json(success(result, '违纪登记成功'));
}

export async function updateViolation(req: Request, res: Response): Promise<void> {
  const result = await dormService.updateViolation(req.params.id, req.body);
  res.json(success(result, '违纪记录已更新'));
}

export async function deleteViolation(req: Request, res: Response): Promise<void> {
  await dormService.deleteViolation(req.params.id);
  res.json(success(null, '违纪记录已删除'));
}

// ========== 报修工单处理 ==========

export async function listRepairs(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', status, type, studentNo, studentName } = req.query;
  const result = await dormService.listRepairs({
    page: Number(page),
    pageSize: Number(pageSize),
    status: status as any | undefined,
    type: type as any | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function handleRepair(req: Request, res: Response): Promise<void> {
  const handlerId = requireAdminId(req);
  const result = await dormService.handleRepair(req.params.id, handlerId, req.body);
  res.json(success(result, '工单处理成功'));
}
