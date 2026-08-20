import { Prisma } from '@prisma/client';

export interface ApiResponse<T = unknown> {
  code: number;       // 0 成功，非 0 失败
  message: string;
  data: T;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 成功响应 */
export function success<T>(data: T, message = '操作成功'): ApiResponse<T> {
  return { code: 0, message, data };
}

/** 失败响应 */
export function fail(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null };
}

/** 分页结果 */
export function pageResult<T>(list: T[], total: number, page: number, pageSize: number): PageResult<T> {
  return { list, total, page, pageSize };
}

/** Express 中间件：分页参数解析 */
export function parsePagination(req: any, _res: any, next: any): void {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
  req.pagination = {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
  next();
}

/** Prisma 已知错误码映射 */
export const PRISMA_ERROR_MAP: Record<string, { code: number; message: string }> = {
  P2002: { code: 40901, message: '唯一约束冲突，数据已存在' },
  P2025: { code: 40404, message: '记录不存在' },
  P2003: { code: 40009, message: '外键约束失败，关联数据不存在' },
};

export function mapPrismaError(e: Prisma.PrismaClientKnownRequestError) {
  return PRISMA_ERROR_MAP[e.code] || { code: 50000, message: '数据库错误' };
}
