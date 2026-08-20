import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import * as baseService from '../../services/admin/base.service';

// ========== 院系 ==========

export async function departmentTree(_req: Request, res: Response): Promise<void> {
  const result = await baseService.departmentTree();
  res.json(success(result));
}

export async function departmentList(_req: Request, res: Response): Promise<void> {
  const result = await baseService.departmentList();
  res.json(success(result));
}

export async function departmentCreate(req: Request, res: Response): Promise<void> {
  const result = await baseService.departmentCreate(req.body);
  res.json(success(result, '创建成功'));
}

export async function departmentUpdate(req: Request, res: Response): Promise<void> {
  const result = await baseService.departmentUpdate(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

export async function departmentRemove(req: Request, res: Response): Promise<void> {
  await baseService.departmentRemove(req.params.id);
  res.json(success(null, '删除成功'));
}

// ========== 专业 ==========

export async function majorList(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', departmentId, name } = req.query;
  const result = await baseService.majorList({
    page: Number(page),
    pageSize: Number(pageSize),
    departmentId: departmentId as string | undefined,
    name: name as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function majorCreate(req: Request, res: Response): Promise<void> {
  const result = await baseService.majorCreate(req.body);
  res.json(success(result, '创建成功'));
}

export async function majorUpdate(req: Request, res: Response): Promise<void> {
  const result = await baseService.majorUpdate(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

export async function majorRemove(req: Request, res: Response): Promise<void> {
  await baseService.majorRemove(req.params.id);
  res.json(success(null, '删除成功'));
}

// ========== 班级 ==========

export async function classList(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', departmentId, majorId, name } = req.query;
  const result = await baseService.classList({
    page: Number(page),
    pageSize: Number(pageSize),
    departmentId: departmentId as string | undefined,
    majorId: majorId as string | undefined,
    name: name as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function classCreate(req: Request, res: Response): Promise<void> {
  const result = await baseService.classCreate(req.body);
  res.json(success(result, '创建成功'));
}

export async function classUpdate(req: Request, res: Response): Promise<void> {
  const result = await baseService.classUpdate(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

export async function classRemove(req: Request, res: Response): Promise<void> {
  await baseService.classRemove(req.params.id);
  res.json(success(null, '删除成功'));
}

// ========== 教师 ==========

export async function teacherList(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', departmentId, name } = req.query;
  const result = await baseService.teacherList({
    page: Number(page),
    pageSize: Number(pageSize),
    departmentId: departmentId as string | undefined,
    name: name as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function teacherCreate(req: Request, res: Response): Promise<void> {
  const result = await baseService.teacherCreate(req.body);
  res.json(success(result, '创建成功'));
}

export async function teacherUpdate(req: Request, res: Response): Promise<void> {
  const result = await baseService.teacherUpdate(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

export async function teacherRemove(req: Request, res: Response): Promise<void> {
  await baseService.teacherRemove(req.params.id);
  res.json(success(null, '删除成功'));
}

// ========== 课程 ==========

export async function courseList(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', departmentId, name, type } = req.query;
  const result = await baseService.courseList({
    page: Number(page),
    pageSize: Number(pageSize),
    departmentId: departmentId as string | undefined,
    name: name as string | undefined,
    type: type as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function courseCreate(req: Request, res: Response): Promise<void> {
  const result = await baseService.courseCreate(req.body);
  res.json(success(result, '创建成功'));
}

export async function courseUpdate(req: Request, res: Response): Promise<void> {
  const result = await baseService.courseUpdate(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

export async function courseRemove(req: Request, res: Response): Promise<void> {
  await baseService.courseRemove(req.params.id);
  res.json(success(null, '删除成功'));
}

// ========== 字典 ==========

export async function dictList(req: Request, res: Response): Promise<void> {
  const { type } = req.query;
  const result = await baseService.dictList({ type: type as string | undefined });
  res.json(success(result));
}

export async function dictByType(req: Request, res: Response): Promise<void> {
  const result = await baseService.dictByType(req.params.type);
  res.json(success(result));
}

export async function dictCreate(req: Request, res: Response): Promise<void> {
  const result = await baseService.dictCreate(req.body);
  res.json(success(result, '创建成功'));
}

export async function dictUpdate(req: Request, res: Response): Promise<void> {
  const result = await baseService.dictUpdate(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

export async function dictRemove(req: Request, res: Response): Promise<void> {
  await baseService.dictRemove(req.params.id);
  res.json(success(null, '删除成功'));
}
