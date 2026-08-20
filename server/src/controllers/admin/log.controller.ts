import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import * as logService from '../../services/admin/log.service';

/** GET /api/admin/system/logs/login */
export async function loginLogs(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', username, status, startDate, endDate } = req.query;
  const result = await logService.loginLogs({
    page: Number(page),
    pageSize: Number(pageSize),
    username: username as string | undefined,
    status: status as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

/** GET /api/admin/system/logs/operation */
export async function operationLogs(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', adminId, module, startDate, endDate } = req.query;
  const result = await logService.operationLogs({
    page: Number(page),
    pageSize: Number(pageSize),
    adminId: adminId as string | undefined,
    module: module as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}
