import { Request, Response } from 'express';
import { success, pageResult } from '../../shared/response/response';
import { requireAdminId } from '../../middlewares/admin';
import * as noticeService from '../../services/admin/notice.service';

export async function listNotices(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', title, scope, published } = req.query;
  const result = await noticeService.listNotices({
    page: Number(page),
    pageSize: Number(pageSize),
    title: title as string | undefined,
    scope: scope as any | undefined,
    published: published === 'true' ? true : published === 'false' ? false : undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}

export async function getNotice(req: Request, res: Response): Promise<void> {
  const result = await noticeService.getNotice(req.params.id);
  res.json(success(result));
}

export async function createNotice(req: Request, res: Response): Promise<void> {
  const publisherId = requireAdminId(req);
  const result = await noticeService.createNotice(req.body, publisherId);
  res.json(success(result, '通知创建成功'));
}

export async function updateNotice(req: Request, res: Response): Promise<void> {
  const result = await noticeService.updateNotice(req.params.id, req.body);
  res.json(success(result, '通知更新成功'));
}

export async function deleteNotice(req: Request, res: Response): Promise<void> {
  await noticeService.deleteNotice(req.params.id);
  res.json(success(null, '通知已删除'));
}

export async function publishNotice(req: Request, res: Response): Promise<void> {
  const result = await noticeService.publishNotice(req.params.id);
  res.json(success(result, '通知已发布'));
}

export async function getReadStats(req: Request, res: Response): Promise<void> {
  const result = await noticeService.getReadStats(req.params.id);
  res.json(success(result));
}

export async function getReaders(req: Request, res: Response): Promise<void> {
  const { page = '1', pageSize = '10', read } = req.query;
  const result = await noticeService.getReaders(req.params.id, {
    page: Number(page),
    pageSize: Number(pageSize),
    read: read === 'true' ? true : read === 'false' ? false : undefined,
  });
  res.json(success(pageResult(result.list, result.total, result.page, result.pageSize)));
}
