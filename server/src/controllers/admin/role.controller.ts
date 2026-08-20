import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as roleService from '../../services/admin/role.service';

/** GET /api/admin/system/roles */
export async function list(_req: Request, res: Response): Promise<void> {
  const result = await roleService.list();
  res.json(success(result));
}

/** GET /api/admin/system/roles/:id */
export async function getById(req: Request, res: Response): Promise<void> {
  const result = await roleService.getById(req.params.id);
  res.json(success(result));
}

/** POST /api/admin/system/roles */
export async function create(req: Request, res: Response): Promise<void> {
  const result = await roleService.create(req.body);
  res.json(success(result, '创建成功'));
}

/** PUT /api/admin/system/roles/:id */
export async function update(req: Request, res: Response): Promise<void> {
  const result = await roleService.update(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

/** PUT /api/admin/system/roles/:id/menus */
export async function assignMenus(req: Request, res: Response): Promise<void> {
  const { menuIds } = req.body;
  const result = await roleService.assignMenus(req.params.id, menuIds);
  res.json(success(result, '菜单权限已更新'));
}

/** PUT /api/admin/system/roles/:id/permissions */
export async function assignPermissions(req: Request, res: Response): Promise<void> {
  const { permissions } = req.body;
  const result = await roleService.assignPermissions(req.params.id, permissions);
  res.json(success(result, '接口权限已更新'));
}

/** DELETE /api/admin/system/roles/:id */
export async function remove(req: Request, res: Response): Promise<void> {
  await roleService.remove(req.params.id);
  res.json(success(null, '删除成功'));
}
