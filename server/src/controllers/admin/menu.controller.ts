import { Request, Response } from 'express';
import { success } from '../../shared/response/response';
import * as menuService from '../../services/admin/menu.service';

/** GET /api/admin/system/menus —— 菜单树 */
export async function tree(_req: Request, res: Response): Promise<void> {
  const result = await menuService.getTree();
  res.json(success(result));
}

/** GET /api/admin/system/menus/list —— 菜单扁平列表 */
export async function list(_req: Request, res: Response): Promise<void> {
  const result = await menuService.list();
  res.json(success(result));
}

/** POST /api/admin/system/menus —— 创建菜单 */
export async function create(req: Request, res: Response): Promise<void> {
  const result = await menuService.create(req.body);
  res.json(success(result, '创建成功'));
}

/** PUT /api/admin/system/menus/:id —— 更新菜单 */
export async function update(req: Request, res: Response): Promise<void> {
  const result = await menuService.update(req.params.id, req.body);
  res.json(success(result, '更新成功'));
}

/** DELETE /api/admin/system/menus/:id —— 删除菜单 */
export async function remove(req: Request, res: Response): Promise<void> {
  await menuService.remove(req.params.id);
  res.json(success(null, '删除成功'));
}
