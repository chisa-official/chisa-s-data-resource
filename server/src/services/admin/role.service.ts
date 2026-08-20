import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { DataScope } from '@prisma/client';

/** 角色列表 */
export async function list() {
  const roles = await prisma.role.findMany({
    include: { _count: { select: { admins: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return roles.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    dataScope: r.dataScope,
    menus: (r.menus as string[]) || [],
    permissions: (r.permissions as string[]) || [],
    adminCount: r._count.admins,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** 角色详情 */
export async function getById(id: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound('角色不存在');
  return {
    id: role.id,
    name: role.name,
    code: role.code,
    dataScope: role.dataScope,
    menus: (role.menus as string[]) || [],
    permissions: (role.permissions as string[]) || [],
    createdAt: role.createdAt.toISOString(),
  };
}

/** 创建角色 */
export async function create(data: {
  name: string;
  code: string;
  dataScope: DataScope;
  permissions?: string[];
}) {
  const existing = await prisma.role.findUnique({ where: { code: data.code } });
  if (existing) throw ApiError.conflict('角色编码已存在');

  const role = await prisma.role.create({
    data: {
      name: data.name,
      code: data.code,
      dataScope: data.dataScope,
      permissions: data.permissions || [],
    },
  });
  return { id: role.id, name: role.name, code: role.code, dataScope: role.dataScope };
}

/** 更新角色 */
export async function update(id: string, data: {
  name?: string;
  dataScope?: DataScope;
  permissions?: string[];
}) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound('角色不存在');
  if (role.code === 'SUPER_ADMIN') throw ApiError.badRequest('超级管理员角色不可修改');

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.dataScope !== undefined) updateData.dataScope = data.dataScope;
  if (data.permissions !== undefined) updateData.permissions = data.permissions;

  const updated = await prisma.role.update({ where: { id }, data: updateData });
  return { id: updated.id, name: updated.name, code: updated.code, dataScope: updated.dataScope };
}

/** 分配菜单权限 */
export async function assignMenus(id: string, menuIds: string[]) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound('角色不存在');

  await prisma.role.update({
    where: { id },
    data: { menus: menuIds },
  });
  return { id, menus: menuIds };
}

/** 分配接口权限 */
export async function assignPermissions(id: string, permissions: string[]) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound('角色不存在');

  await prisma.role.update({
    where: { id },
    data: { permissions },
  });
  return { id, permissions };
}

/** 删除角色 */
export async function remove(id: string) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw ApiError.notFound('角色不存在');
  if (role.code === 'SUPER_ADMIN') throw ApiError.badRequest('超级管理员角色不可删除');

  const adminCount = await prisma.admin.count({ where: { roleId: id } });
  if (adminCount > 0) throw ApiError.badRequest('该角色下仍有管理员，无法删除');

  await prisma.role.delete({ where: { id } });
}
