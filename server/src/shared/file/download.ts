import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { storageProvider } from './storage';
import { ApiError } from '../error/ApiError';
import { logger } from '../logger/logger';
import path from 'path';
import fs from 'fs';

/** 根据 fileId 下载文件（流式响应） */
export async function downloadFile(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const record = await prisma.fileRecord.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('文件不存在');

  try {
    if (record.storage === 'LOCAL') {
      // 本地文件直接流式返回
      const absPath = path.resolve(process.env.UPLOAD_DIR || 'uploads', record.path);
      if (!fs.existsSync(absPath)) throw ApiError.notFound('文件已被删除');
      const ext = path.extname(record.filename).toLowerCase();
      const inlineExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
      const disposition = inlineExts.includes(ext) ? 'inline' : 'attachment';
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(record.filename)}"`);
      fs.createReadStream(absPath).pipe(res);
    } else {
      // OSS
      const buffer = await storageProvider.download(record.path);
      res.setHeader('Content-Type', record.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(record.filename)}"`);
      res.send(buffer);
    }
  } catch (e) {
    logger.error('文件下载失败', { fileId: id, error: e });
    throw e;
  }
}

/** 本地静态文件访问（按存储路径返回，用于图片预览等） */
export async function serveLocalFile(req: Request, res: Response): Promise<void> {
  const key = req.params[0]; // 通配 key
  if (!key) throw ApiError.badRequest('文件路径错误');
  const absPath = path.resolve(process.env.UPLOAD_DIR || 'uploads', key);
  // 防止路径穿越
  const uploadRoot = path.resolve(process.env.UPLOAD_DIR || 'uploads');
  if (!absPath.startsWith(uploadRoot)) throw ApiError.forbidden('非法路径');
  if (!fs.existsSync(absPath)) throw ApiError.notFound('文件不存在');
  res.sendFile(absPath);
}
