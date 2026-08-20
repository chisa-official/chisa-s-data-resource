import { Router } from 'express';
import { asyncHandler } from '../../shared/error/handler';
import { success } from '../../shared/response/response';
import { authMiddleware, adminOnly } from '../../shared/auth/middleware';
import { ApiError } from '../../shared/error/ApiError';
import {
  backupDatabase,
  restoreDatabase,
  listBackups,
  deleteBackup,
} from '../../shared/backup/mysql-backup';
import path from 'path';
import fs from 'fs';
import { BACKUP_DIR } from '../../shared/utils/prisma';

const router = Router();

router.use(authMiddleware, adminOnly);

/** GET /api/admin/backup/list —— 备份文件列表 */
router.get(
  '/list',
  asyncHandler(async (_req, res) => {
    const list = await listBackups();
    res.json(success(list));
  }),
);

/** POST /api/admin/backup/run —— 立即备份 */
router.post(
  '/run',
  asyncHandler(async (_req, res) => {
    const filename = await backupDatabase();
    res.json(success({ filename }, '备份成功'));
  }),
);

/** POST /api/admin/backup/restore —— 恢复（传 filename） */
router.post(
  '/restore',
  asyncHandler(async (req, res) => {
    const { filename, confirm } = req.body;
    if (!confirm || confirm !== 'YES') {
      throw ApiError.badRequest('恢复操作需二次确认：请传 confirm="YES"');
    }
    // 恢复前自动生成一份当前状态备份
    await backupDatabase();
    await restoreDatabase(filename);
    res.json(success(null, '恢复成功'));
  }),
);

/** DELETE /api/admin/backup/:filename —— 删除备份 */
router.delete(
  '/:filename',
  asyncHandler(async (req, res) => {
    await deleteBackup(req.params.filename);
    res.json(success(null, '删除成功'));
  }),
);

/** GET /api/admin/backup/:filename/download —— 下载备份文件 */
router.get(
  '/:filename/download',
  asyncHandler(async (req, res) => {
    const filePath = path.join(BACKUP_DIR, req.params.filename);
    if (!filePath.startsWith(BACKUP_DIR)) throw ApiError.forbidden('非法路径');
    if (!fs.existsSync(filePath)) throw ApiError.notFound('备份文件不存在');
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.filename}"`);
    fs.createReadStream(filePath).pipe(res);
  }),
);

export default router;
