import { prisma } from '../../shared/utils/prisma';

/** 登录日志查询 */
export async function loginLogs(params: {
  page: number;
  pageSize: number;
  username?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page, pageSize, username, status, startDate, endDate } = params;
  const where: any = {};
  if (username) where.username = { contains: username };
  if (status) where.status = status;
  if (startDate || endDate) {
    where.loginAt = {};
    if (startDate) where.loginAt.gte = new Date(startDate);
    if (endDate) where.loginAt.lte = new Date(endDate);
  }

  const [list, total] = await Promise.all([
    prisma.loginLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { loginAt: 'desc' },
    }),
    prisma.loginLog.count({ where }),
  ]);

  return {
    list: list.map((l) => ({
      id: l.id,
      username: l.username,
      ip: l.ip,
      location: l.location,
      browser: l.browser,
      os: l.os,
      status: l.status,
      message: l.message,
      loginAt: l.loginAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

/** 操作日志查询 */
export async function operationLogs(params: {
  page: number;
  pageSize: number;
  adminId?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { page, pageSize, adminId, module: moduleName, startDate, endDate } = params;
  const where: any = {};
  if (adminId) where.adminId = adminId;
  if (moduleName) where.module = { contains: moduleName };
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [list, total] = await Promise.all([
    prisma.operationLog.findMany({
      where,
      include: { admin: { select: { username: true, realName: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.operationLog.count({ where }),
  ]);

  return {
    list: list.map((l) => ({
      id: l.id,
      adminId: l.adminId,
      adminName: l.admin?.realName || l.admin?.username,
      module: l.module,
      action: l.action,
      method: l.method,
      url: l.url,
      params: l.params,
      ip: l.ip,
      costTime: l.costTime,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}
