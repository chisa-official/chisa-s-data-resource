import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import * as userService from '../../services/admin/user.service';

/** GET /api/admin/system/users */
export async function list(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', username, realName, status, roleId } = req.query;
  const result = await userService.list({
    page: Number(page),
    pageSize: Number(pageSize),
    username: username as string | undefined,
    realName: realName as string | undefined,
    status: status as string | undefined,
    roleId: roleId as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

/** GET /api/admin/system/users/:id */
export async function getById(req: Request, res: Response): Promise<void> {
  const result = await userService.getById(req.params.id);
  res.json(success(result));
}

/** POST /api/admin/system/users */
export async function create(req: Request, res: Response): Promise<void> {
  const result = await userService.create(req.body);
  res.json(success(result, '创建成功'));
}

/** PUT /api/admin/system/users/:id */
export async function update(req: Request, res: Response): Promise<void> {
  const result = await userService.update(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

/** PUT /api/admin/system/users/:id/status */
export async function toggleStatus(req: Request, res: Response): Promise<void> {
  const result = await userService.toggleStatus(req.params.id);
  res.json(success(result, '状态已切换'));
}

/** DELETE /api/admin/system/users/:id */
export async function remove(req: Request, res: Response): Promise<void> {
  await userService.remove(req.params.id);
  res.json(success(null, '删除成功'));
}
