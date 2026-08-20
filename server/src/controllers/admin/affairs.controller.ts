import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import { requireAdminId } from '../../middlewares/admin';
import * as affairsService from '../../services/admin/affairs.service';

// ========== 请假审批 ==========

export async function listLeaves(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', status, type, studentNo, studentName } = req.query;
  const result = await affairsService.listLeaves({
    page: Number(page),
    pageSize: Number(pageSize),
    status: status as any | undefined,
    type: type as any | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function approveLeave(req: Request, res: Response): Promise<void> {
  const approverId = requireAdminId(req);
  const result = await affairsService.approveLeave(req.params.id, approverId);
  res.json(success(result, '审批通过'));
}

export async function forwardLeave(req: Request, res: Response): Promise<void> {
  const approverId = requireAdminId(req);
  const result = await affairsService.forwardLeave(req.params.id, approverId);
  res.json(success(result, '已转交下一级'));
}

export async function rejectLeave(req: Request, res: Response): Promise<void> {
  const approverId = requireAdminId(req);
  const result = await affairsService.rejectLeave(req.params.id, approverId, req.body.reason);
  res.json(success(result, '已驳回'));
}

// ========== 奖助贷项目 ==========

export async function listAwardProjects(req: Request, res: Response): Promise<void> {
  const list = await affairsService.listAwardProjects();
  res.json(success(list));
}

export async function createAwardProject(req: Request, res: Response): Promise<void> {
  const result = await affairsService.createAwardProject(req.body);
  res.json(success(result, '项目创建成功'));
}

export async function updateAwardProject(req: Request, res: Response): Promise<void> {
  const result = await affairsService.updateAwardProject(req.params.id, req.body);
  res.json(success(result, '项目更新成功'));
}

export async function deleteAwardProject(req: Request, res: Response): Promise<void> {
  await affairsService.deleteAwardProject(req.params.id);
  res.json(success(null, '项目已删除'));
}

// ========== 奖助申请审核 ==========

export async function listAwardApplies(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', status, type, studentNo, studentName, semester } = req.query;
  const result = await affairsService.listAwardApplies({
    page: Number(page),
    pageSize: Number(pageSize),
    status: status as any | undefined,
    type: type as any | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
    semester: semester as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function auditAward(req: Request, res: Response): Promise<void> {
  const result = await affairsService.auditAward(req.params.id, req.body);
  res.json(success(result, '审核完成'));
}

export async function publishAward(req: Request, res: Response): Promise<void> {
  await affairsService.publishAward(req.params.id);
  res.json(success(null, '已公示'));
}

export async function batchPublishAward(req: Request, res: Response): Promise<void> {
  const result = await affairsService.batchPublishAward(req.body.ids);
  res.json(success(result, `已公示 ${result.count} 条`));
}

// ========== 违纪处分 ==========

export async function listDisciplines(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', type, studentNo, studentName } = req.query;
  const result = await affairsService.listDisciplines({
    page: Number(page),
    pageSize: Number(pageSize),
    type: type as any | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function createDiscipline(req: Request, res: Response): Promise<void> {
  const result = await affairsService.createDiscipline(req.body);
  res.json(success(result, '违纪录入成功'));
}

export async function updateDiscipline(req: Request, res: Response): Promise<void> {
  const result = await affairsService.updateDiscipline(req.params.id, req.body);
  res.json(success(result, '违纪记录已更新'));
}

export async function deleteDiscipline(req: Request, res: Response): Promise<void> {
  await affairsService.deleteDiscipline(req.params.id);
  res.json(success(null, '违纪记录已删除'));
}

// ========== 评优评先 ==========

export async function listHonors(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', status, studentNo, studentName, semester } = req.query;
  const result = await affairsService.listHonors({
    page: Number(page),
    pageSize: Number(pageSize),
    status: status as any | undefined,
    studentNo: studentNo as string | undefined,
    studentName: studentName as string | undefined,
    semester: semester as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function grantHonor(req: Request, res: Response): Promise<void> {
  const result = await affairsService.grantHonor(req.body);
  res.json(success(result, '荣誉授予成功'));
}

export async function auditHonor(req: Request, res: Response): Promise<void> {
  const result = await affairsService.auditHonor(req.params.id, req.body);
  res.json(success(result, '审核完成'));
}
