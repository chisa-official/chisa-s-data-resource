import { get, post, put, del } from '@shared-web/utils/request';
import type { Menu, MenuType } from '@shared-web/types';

export interface CreateMenuParams {
  parentId?: string | null;
  name: string;
  path?: string;
  component?: string;
  icon?: string;
  sort?: number;
  type: MenuType;
  permission?: string;
  visible?: boolean;
}

export type UpdateMenuParams = Partial<CreateMenuParams>;

/** 菜单树 */
export function getMenuTree(): Promise<Menu[]> {
  return get('/admin/system/menus');
}

/** 菜单扁平列表 */
export function getMenuList(): Promise<Menu[]> {
  return get('/admin/system/menus/list');
}

/** 创建菜单 */
export function createMenu(params: CreateMenuParams): Promise<Menu> {
  return post('/admin/system/menus', params);
}

/** 更新菜单 */
export function updateMenu(id: string, params: UpdateMenuParams): Promise<Menu> {
  return put(`/admin/system/menus/${id}`, params);
}

/** 删除菜单 */
export function deleteMenu(id: string): Promise<void> {
  return del(`/admin/system/menus/${id}`);
}
