import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { hashPassword } from '../../shared/utils/crypto';
import { AdminStatus } from '@prisma/client';

/** 管理员列表（分页 + 筛选） */
export async function list(params: {
  page: number;
  pageSize: number;
  username?: string;
  realName?: string;
  status?: string;
  roleId?: string;
}) {
  const { page, pageSize, username, realName, status, roleId } = params;
  const where: any = {};
  if (username) where.username = { contains: username };
  if (realName) where.realName = { contains: realName };
  if (status) where.status = status;
  if (roleId) where.roleId = roleId;

  const [list, total] = await Promise.all([
    prisma.admin.findMany({
      where,
      include: { role: { select: { id: true, name: true, code: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.admin.count({ where }),
  ]);

  return {
    list: list.map((a) => ({
      id: a.id,
      username: a.username,
      realName: a.realName,
      roleId: a.roleId,
      role: a.role,
      phone: a.phone,
      status: a.status,
      lastLoginAt: a.lastLoginAt?.toISOString() || null,
      createdAt: a.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

/** 管理员详情 */
export async function getById(id: string) {
  const admin = await prisma.admin.findUnique({
    where: { id },
    include: { role: { select: { id: true, name: true, code: true } } },
  });
  if (!admin) throw ApiError.notFound('管理员不存在');
  return {
    id: admin.id,
    username: admin.username,
    realName: admin.realName,
    roleId: admin.roleId,
    role: admin.role,
    phone: admin.phone,
    status: admin.status,
    lastLoginAt: admin.lastLoginAt?.toISOString() || null,
    createdAt: admin.createdAt.toISOString(),
  };
}

/** 创建管理员 */
export async function create(data: {
  username: string;
  password: string;
  realName: string;
  roleId: string;
  phone?: string;
}) {
  const existing = await prisma.admin.findUnique({ where: { username: data.username } });
  if (existing) throw ApiError.conflict('用户名已存在');

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role) throw ApiError.badRequest('角色不存在');

  const hashed = await hashPassword(data.password);
  const admin = await prisma.admin.create({
    data: {
      username: data.username,
      password: hashed,
      realName: data.realName,
      roleId: data.roleId,
      phone: data.phone,
    },
    include: { role: { select: { id: true, name: true, code: true } } },
  });
  return {
    id: admin.id,
    username: admin.username,
    realName: admin.realName,
    roleId: admin.roleId,
    role: admin.role,
    phone: admin.phone,
    status: admin.status,
    createdAt: admin.createdAt.toISOString(),
  };
}

/** 更新管理员 */
export async function update(id: string, data: {
  realName?: string;
  roleId?: string;
  phone?: string;
  password?: string;
}) {
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) throw ApiError.notFound('管理员不存在');

  const updateData: any = {};
  if (data.realName !== undefined) updateData.realName = data.realName;
  if (data.roleId !== undefined) {
    const role = await prisma.role.findUnique({ where: { id: data.roleId } });
    if (!role) throw ApiError.badRequest('角色不存在');
    updateData.roleId = data.roleId;
  }
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.password) updateData.password = await hashPassword(data.password);

  const updated = await prisma.admin.update({
    where: { id },
    data: updateData,
    include: { role: { select: { id: true, name: true, code: true } } },
  });
  return {
    id: updated.id,
    username: updated.username,
    realName: updated.realName,
    roleId: updated.roleId,
    role: updated.role,
    phone: updated.phone,
    status: updated.status,
  };
}

/** 切换启用/禁用 */
export async function toggleStatus(id: string) {
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) throw ApiError.notFound('管理员不存在');
  if (admin.username === 'admin') throw ApiError.badRequest('超级管理员不可禁用');

  const newStatus = admin.status === AdminStatus.ACTIVE ? AdminStatus.DISABLED : AdminStatus.ACTIVE;
  await prisma.admin.update({ where: { id }, data: { status: newStatus } });
  return { id, status: newStatus };
}

/** 删除管理员 */
export async function remove(id: string) {
  const admin = await prisma.admin.findUnique({ where: { id } });
  if (!admin) throw ApiError.notFound('管理员不存在');
  if (admin.username === 'admin') throw ApiError.badRequest('超级管理员不可删除');
  await prisma.admin.delete({ where: { id } });
}
