import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { ApiError } from './ApiError';
import { fail, mapPrismaError } from '../response/response';
import { logger } from '../logger/logger';

/** 全局错误处理中间件 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // ApiError：按其 status 返回
  if (err instanceof ApiError) {
    res.status(err.status).json(fail(err.code, err.message));
    return;
  }

  // Zod 校验错误：返回 400 + 字段错误
  if (err instanceof ZodError) {
    const first = err.errors[0];
    const message = first ? `${first.path.join('.') || '参数'}: ${first.message}` : '参数校验失败';
    res.status(400).json(fail(40000, message));
    return;
  }

  // Prisma 已知错误
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    const status = mapped.code === 40404 ? 404 : mapped.code === 40901 ? 409 : 400;
    res.status(status).json(fail(mapped.code, mapped.message));
    return;
  }

  // 未知错误：写日志，不泄露堆栈
  logger.error('未处理错误', {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });
  res.status(500).json(fail(50000, '服务器内部错误'));
}

/** 404 兜底 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json(fail(40400, `接口不存在: ${req.method} ${req.originalUrl}`));
}

/** 异步错误包裹：避免 try/catch 模板代码 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
