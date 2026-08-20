import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { success, pageResult } from '../../shared/response/response';
import { prisma } from '../../shared/utils/prisma';
import { ApiError } from '../../shared/error/ApiError';
import { authMiddleware } from '../../shared/auth/middleware';
import { storageProvider } from '../../shared/file/storage';
import { createUploader, generateStorageKey, ALLOWED_MIME } from '../../shared/file/upload';
import { downloadFile, serveLocalFile } from '../../shared/file/download';
import { UserType } from '@prisma/client';
import path from 'path';
import { parsePagination } from '../../shared/response/response';

const router = Router();

// 本地静态文件访问（图片预览等，无需鉴权便于前端展示）
router.get('/local/*', serveLocalFile);

// 以下接口均需登录
router.use(authMiddleware);

const uploadSingle = createUploader({ maxCount: 1 });
const uploadMultiple = createUploader({ maxCount: 10 });

/** POST /api/shared/files/upload —— 单文件上传 */
router.post(
  '/upload',
  uploadSingle.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw ApiError.badRequest('未上传文件');
    const bizType = (req.body.bizType as string) || 'common';
    const key = generateStorageKey(req.file.originalname, bizType);
    await storageProvider.upload(req.file.buffer, key, req.file.mimetype);

    const record = await prisma.fileRecord.create({
      data: {
        filename: req.file.originalname,
        storedName: path.basename(key),
        mimeType: req.file.mimetype,
        size: req.file.size,
        path: key,
        storage: 'LOCAL',
        uploaderId: req.user!.userId,
        uploaderType: req.user!.userType,
        bizType,
      },
    });
    res.json(success({
      id: record.id,
      filename: record.filename,
      url: storageProvider.getUrl(key),
      size: record.size,
    }));
  }),
);

/** POST /api/shared/files/upload-multiple —— 多文件上传 */
router.post(
  '/upload-multiple',
  uploadMultiple.array('files', 10),
  asyncHandler(async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) throw ApiError.badRequest('未上传文件');
    const bizType = (req.body.bizType as string) || 'common';
    const result = [];
    for (const file of files) {
      const key = generateStorageKey(file.originalname, bizType);
      await storageProvider.upload(file.buffer, key, file.mimetype);
      const record = await prisma.fileRecord.create({
        data: {
          filename: file.originalname,
          storedName: path.basename(key),
          mimeType: file.mimetype,
          size: file.size,
          path: key,
          storage: 'LOCAL',
          uploaderId: req.user!.userId,
          uploaderType: req.user!.userType,
          bizType,
        },
      });
      result.push({
        id: record.id,
        filename: record.filename,
        url: storageProvider.getUrl(key),
        size: record.size,
      });
    }
    res.json(success(result));
  }),
);

/** GET /api/shared/files/:id —— 获取文件信息 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const record = await prisma.fileRecord.findUnique({ where: { id: req.params.id } });
    if (!record) throw ApiError.notFound('文件不存在');
    res.json(success({
      id: record.id,
      filename: record.filename,
      mimeType: record.mimeType,
      size: record.size,
      url: storageProvider.getUrl(record.path),
      createdAt: record.createdAt,
    }));
  }),
);

/** GET /api/shared/files/:id/download —— 下载文件 */
router.get('/:id/download', asyncHandler(downloadFile));

/** DELETE /api/shared/files/:id —— 删除文件（仅上传者或管理员） */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const record = await prisma.fileRecord.findUnique({ where: { id: req.params.id } });
    if (!record) throw ApiError.notFound('文件不存在');
    // 仅上传者或管理员可删
    const isOwner = record.uploaderId === req.user!.userId;
    const isAdmin = req.user!.userType === UserType.ADMIN;
    if (!isOwner && !isAdmin) throw ApiError.forbidden('无权删除他人文件');
    await storageProvider.delete(record.path);
    await prisma.fileRecord.delete({ where: { id: req.params.id } });
    res.json(success(null, '文件已删除'));
  }),
);

export default router;
