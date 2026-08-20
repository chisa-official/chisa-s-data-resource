import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { MenuType } from '@prisma/client';

/** 菜单树（全量） */
export async function getTree() {
  const menus = await prisma.menu.findMany({
    orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
  });
  return buildTree(menus, null);
}

/** 菜单列表（扁平） */
export async function list() {
  const menus = await prisma.menu.findMany({
    orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
  });
  return menus.map((m) => ({
    id: m.id,
    parentId: m.parentId,
    name: m.name,
    path: m.path,
    component: m.component,
    icon: m.icon,
    sort: m.sort,
    type: m.type,
    permission: m.permission,
    visible: m.visible,
  }));
}

/** 创建菜单 */
export async function create(data: {
  parentId?: string;
  name: string;
  path?: string;
  component?: string;
  icon?: string;
  sort?: number;
  type: MenuType;
  permission?: string;
  visible?: boolean;
}) {
  if (data.parentId) {
    const parent = await prisma.menu.findUnique({ where: { id: data.parentId } });
    if (!parent) throw ApiError.badRequest('父级菜单不存在');
  }

  const menu = await prisma.menu.create({
    data: {
      parentId: data.parentId || null,
      name: data.name,
      path: data.path || null,
      component: data.component || null,
      icon: data.icon || null,
      sort: data.sort ?? 0,
      type: data.type,
      permission: data.permission || null,
      visible: data.visible ?? true,
    },
  });
  return {
    id: menu.id,
    parentId: menu.parentId,
    name: menu.name,
    path: menu.path,
    component: menu.component,
    icon: menu.icon,
    sort: menu.sort,
    type: menu.type,
    permission: menu.permission,
    visible: menu.visible,
  };
}

/** 更新菜单 */
export async function update(id: string, data: {
  parentId?: string | null;
  name?: string;
  path?: string;
  component?: string;
  icon?: string;
  sort?: number;
  type?: MenuType;
  permission?: string;
  visible?: boolean;
}) {
  const menu = await prisma.menu.findUnique({ where: { id } });
  if (!menu) throw ApiError.notFound('菜单不存在');

  // 防止将自己设为父级
  if (data.parentId === id) throw ApiError.badRequest('不能将自身设为父级');

  const updateData: any = {};
  if (data.parentId !== undefined) updateData.parentId = data.parentId || null;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.path !== undefined) updateData.path = data.path || null;
  if (data.component !== undefined) updateData.component = data.component || null;
  if (data.icon !== undefined) updateData.icon = data.icon || null;
  if (data.sort !== undefined) updateData.sort = data.sort;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.permission !== undefined) updateData.permission = data.permission || null;
  if (data.visible !== undefined) updateData.visible = data.visible;

  const updated = await prisma.menu.update({ where: { id }, data: updateData });
  return {
    id: updated.id,
    parentId: updated.parentId,
    name: updated.name,
    path: updated.path,
    component: updated.component,
    icon: updated.icon,
    sort: updated.sort,
    type: updated.type,
    permission: updated.permission,
    visible: updated.visible,
  };
}

/** 删除菜单 */
export async function remove(id: string) {
  const children = await prisma.menu.findMany({ where: { parentId: id } });
  if (children.length > 0) throw ApiError.badRequest('存在子菜单，无法删除');

  await prisma.menu.delete({ where: { id } });
}

// ===== 辅助 =====

function buildTree(menus: any[], parentId: string | null): any[] {
  return menus
    .filter((m) => (m.parentId || null) === parentId)
    .map((m) => ({
      id: m.id,
      parentId: m.parentId,
      name: m.name,
      path: m.path,
      component: m.component,
      icon: m.icon,
      sort: m.sort,
      type: m.type,
      permission: m.permission,
      visible: m.visible,
      children: buildTree(menus, m.id),
    }))
    .sort((a, b) => a.sort - b.sort);
}
