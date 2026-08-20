import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../error/ApiError';

export interface ValidateSchema {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/** Zod 校验中间件：校验失败抛 ApiError，校验通过后挂载到 req */
export function validate(schema: ValidateSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) req.query = schema.query.parse(req.query) as any;
      if (schema.params) req.params = schema.params.parse(req.params) as any;
      next();
    } catch (e: any) {
      next(ApiError.badRequest(e.errors?.[0]?.message || '参数错误'));
    }
  };
}

// 通用校验 schema 复用
import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const uuidSchema = z.object({
  id: z.string().uuid('ID 格式错误'),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});
