import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../shared/error/ApiError';

/** 当前学期默认值（可通过 query 参数 ?semester=2025-2026-1 覆盖） */
export const DEFAULT_SEMESTER = '2025-2026-1';

/** 解析 semester 查询参数，未传则使用默认学期，挂载到 req.query.semester */
export function semesterParser(req: Request, _res: Response, next: NextFunction): void {
  if (!req.query.semester) {
    req.query.semester = DEFAULT_SEMESTER;
  }
  next();
}

/** 解析 week 查询参数，默认当前周次（1-20），挂载到 req.query.week */
export function weekParser(req: Request, _res: Response, next: NextFunction): void {
  const week = parseInt(req.query.week as string, 10);
  if (isNaN(week) || week < 1 || week > 20) {
    req.query.week = '1'; // 默认第1周（实际可按教学日历计算）
  }
  next();
}

/** 从 req.user 校验学生身份并返回 studentId（学生端所有业务接口前置） */
export function requireStudentId(req: Request): string {
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.userType !== 'STUDENT') throw ApiError.forbidden('仅学生可访问');
  return req.user.userId;
}
