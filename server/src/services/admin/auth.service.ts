import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { comparePassword, hashPassword } from '../../shared/utils/crypto';
import { signAccessToken, signRefreshToken, revokeRefreshToken, verifyRefreshToken } from '../../shared/auth/jwt';
import { blacklistToken } from '../../shared/auth/blacklist';
import { UserType, MenuType, AdminStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
  validateStrongPassword,
  validateUsername,
  validatePhone,
} from '../../shared/utils/validate';

export interface AdminRegisterParams {
  username: string;
  password: string;
  confirmPassword: string;
  realName: string;
  phone?: string;
}

export interface AdminLoginResult {
  accessToken: string;
  refreshToken: string;
  admin: AdminProfile;
}

/** 管理员注册：默认 DISABLED 状态，需超级管理员在后台启用后才能登录 */
export async function register(params: AdminRegisterParams): Promise<{ id: string; username: string }> {
  const { username, password, confirmPassword, realName, phone } = params;

  // 1. 基本字段校验
  const userErr = validateUsername(username);
  if (userErr) throw ApiError.badRequest(userErr);
  const pwdErr = validateStrongPassword(password);
  if (pwdErr) throw ApiError.badRequest(pwdErr);
  if (password !== confirmPassword) throw ApiError.badRequest('两次输入的密码不一致');
  if (!realName?.trim()) throw ApiError.badRequest('真实姓名不能为空');
  const phoneErr = validatePhone(phone);
  if (phoneErr) throw ApiError.badRequest(phoneErr);

  // 2. 用户名唯一性校验
  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) throw ApiError.badRequest('该用户名已被注册');

  // 3. 分配默认角色（最低权限的「学工老师」角色，审核时由超管重新分配）
  const defaultRole = await prisma.role.findFirst({ where: { code: 'STUDENT_AFFAIRS' } })
    || await prisma.role.findFirst();
  if (!defaultRole) throw ApiError.internal('系统尚未初始化角色，请先执行 seed');

  // 4. 创建管理员（默认禁用，审核后启用）
  const hashed = await hashPassword(password);
  const created = await prisma.admin.create({
    data: {
      username,
      password: hashed,
      realName: realName.trim(),
      roleId: defaultRole.id,
      phone: phone || null,
      status: AdminStatus.DISABLED,
    },
  });

  return { id: created.id, username: created.username };
}

export interface AdminProfile {
  id: string;
  username: string;
  realName: string;
  roleId: string;
  role?: { id: string; name: string; code: string; dataScope: string };
  phone?: string | null;
  status: string;
  lastLoginAt?: string | null;
  createdAt: string;
}

/** 管理员登录 */
export async function login(username: string, password: string, ip?: string): Promise<AdminLoginResult> {
  const admin = await prisma.admin.findUnique({
    where: { username },
    include: { role: { select: { id: true, name: true, code: true, dataScope: true } } },
  });
  if (!admin) throw ApiError.unauthorized('用户名或密码错误');
  if (admin.status !== 'ACTIVE') {
    // 注册后的账号默认 DISABLED，提示等待审核
    throw ApiError.forbidden('账号尚未激活，请联系系统管理员审核启用');
  }

  const ok = await comparePassword(password, admin.password);
  if (!ok) throw ApiError.unauthorized('用户名或密码错误');

  const payload = {
    userId: admin.id,
    userType: UserType.ADMIN,
    role: admin.role.code,
    roleId: admin.roleId,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = await signRefreshToken(payload);

  // 更新最后登录时间
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  // 记录登录日志
  await prisma.loginLog.create({
    data: {
      username,
      ip: ip || 'unknown',
      status: 'SUCCESS',
      message: '登录成功',
    },
  });

  return {
    accessToken,
    refreshToken,
    admin: toProfile(admin),
  };
}

/** 获取管理员信息 + 权限 */
export async function getAdminInfo(adminId: string): Promise<AdminProfile & { permissions: string[] }> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    include: { role: { select: { id: true, name: true, code: true, dataScope: true, permissions: true } } },
  });
  if (!admin) throw ApiError.notFound('管理员不存在');

  const permissions: string[] =
    admin.role.code === 'SUPER_ADMIN'
      ? ['*']
      : ((admin.role.permissions as string[]) || []);

  return {
    ...toProfile(admin),
    permissions,
  };
}

/** 获取当前角色可见菜单树 */
export async function getMenuTree(adminId: string): Promise<any[]> {
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    include: { role: true },
  });
  if (!admin) throw ApiError.notFound('管理员不存在');

  const allMenus = await prisma.menu.findMany({
    orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
  });

  // 超管可见全部菜单；其他角色按 role.menus 过滤
  let visibleMenuIds: Set<string>;
  if (admin.role.code === 'SUPER_ADMIN') {
    visibleMenuIds = new Set(allMenus.map((m) => m.id));
  } else {
    const roleMenuIds = (admin.role.menus as string[]) || [];
    visibleMenuIds = new Set(roleMenuIds);
  }

  const menus = allMenus.filter((m) => visibleMenuIds.has(m.id));
  return buildTree(menus, null);
}

/** 修改密码 */
export async function changePassword(adminId: string, oldPassword: string, newPassword: string): Promise<void> {
  const admin = await prisma.admin.findUnique({ where: { id: adminId } });
  if (!admin) throw ApiError.notFound('管理员不存在');

  const ok = await comparePassword(oldPassword, admin.password);
  if (!ok) throw ApiError.badRequest('原密码错误');

  const hashed = await hashPassword(newPassword);
  await prisma.admin.update({
    where: { id: adminId },
    data: { password: hashed },
  });
}

/** 刷新 Token */
export async function refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = await verifyRefreshToken(refreshToken);
  await revokeRefreshToken(refreshToken);
  const accessToken = signAccessToken(payload);
  const newRefresh = await signRefreshToken(payload);
  return { accessToken, refreshToken: newRefresh };
}

/** 登出 */
export async function logout(accessToken?: string, refreshToken?: string): Promise<void> {
  if (accessToken) {
    try {
      const decoded = jwt.decode(accessToken) as { exp?: number } | null;
      const ttl = decoded?.exp ? decoded.exp * 1000 - Date.now() : undefined;
      blacklistToken(accessToken, ttl && ttl > 0 ? ttl : undefined);
    } catch {
      // ignore
    }
  }
  if (refreshToken) await revokeRefreshToken(refreshToken);
}

// ===== 辅助函数 =====

function toProfile(a: any): AdminProfile {
  return {
    id: a.id,
    username: a.username,
    realName: a.realName,
    roleId: a.roleId,
    role: a.role
      ? { id: a.role.id, name: a.role.name, code: a.role.code, dataScope: a.role.dataScope }
      : undefined,
    phone: a.phone,
    status: a.status,
    lastLoginAt: a.lastLoginAt ? a.lastLoginAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
  };
}

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
