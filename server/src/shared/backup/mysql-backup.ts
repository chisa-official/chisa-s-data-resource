import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { dayjs } from '../utils/date';
import { logger } from '../logger/logger';
import { BACKUP_DIR } from '../utils/prisma';

const execAsync = promisify(exec);

function buildConnArgs(): { auth: string; db: string } {
  // 从 DATABASE_URL 解析连接信息
  const url = new URL(process.env.DATABASE_URL || '');
  const host = url.hostname;
  const port = url.port || '3306';
  const user = url.username;
  const password = url.password;
  const db = url.pathname.replace('/', '');
  const auth = `-h${host} -P${port} -u${user}` + (password ? ` -p${password}` : '');
  return { auth, db };
}

/** 备份数据库：mysqldump | gzip，存至 backups/{时间戳}.sql.gz */
export async function backupDatabase(): Promise<string> {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const filename = `${dayjs().format('YYYY-MM-DD-HHmmss')}.sql.gz`;
  const filePath = path.join(BACKUP_DIR, filename);
  const { auth, db } = buildConnArgs();
  const mysqldump = process.env.MYSQL_DUMP_PATH || 'mysqldump';
  const cmd = `${mysqldump} ${auth} ${db} | gzip > "${filePath}"`;
  logger.info(`开始备份数据库: ${filename}`);
  await execAsync(cmd);
  logger.info(`数据库备份完成: ${filename}`);
  return filename;
}

/** 恢复数据库：gunzip | mysql */
export async function restoreDatabase(filename: string): Promise<void> {
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) throw new Error('备份文件不存在');
  const { auth, db } = buildConnArgs();
  const mysql = process.env.MYSQL_PATH || 'mysql';
  const cmd = `gunzip < "${filePath}" | ${mysql} ${auth} ${db}`;
  logger.warn(`开始恢复数据库: ${filename}（此操作将覆盖当前数据）`);
  await execAsync(cmd);
  logger.info(`数据库恢复完成: ${filename}`);
}

/** 列出所有备份文件 */
export async function listBackups(): Promise<{ filename: string; size: number; mtime: string }[]> {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  const files = await fs.promises.readdir(BACKUP_DIR);
  const result: { filename: string; size: number; mtime: string }[] = [];
  for (const f of files) {
    if (!f.endsWith('.sql.gz')) continue;
    const stat = await fs.promises.stat(path.join(BACKUP_DIR, f));
    result.push({
      filename: f,
      size: stat.size,
      mtime: dayjs(stat.mtime).format('YYYY-MM-DD HH:mm:ss'),
    });
  }
  // 按时间倒序
  result.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return result;
}

/** 删除备份文件 */
export async function deleteBackup(filename: string): Promise<void> {
  const filePath = path.join(BACKUP_DIR, filename);
  // 防止路径穿越
  if (!filePath.startsWith(BACKUP_DIR)) throw new Error('非法文件名');
  if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  logger.info(`备份已删除: ${filename}`);
}

/** 清理过期备份（默认保留 30 天） */
export async function cleanExpiredBackups(keepDays = Number(process.env.BACKUP_KEEP_DAYS) || 30): Promise<number> {
  if (!fs.existsSync(BACKUP_DIR)) return 0;
  const files = await fs.promises.readdir(BACKUP_DIR);
  const threshold = dayjs().subtract(keepDays, 'day');
  let count = 0;
  for (const f of files) {
    if (!f.endsWith('.sql.gz')) continue;
    const stat = await fs.promises.stat(path.join(BACKUP_DIR, f));
    if (dayjs(stat.mtime).isBefore(threshold)) {
      await fs.promises.unlink(path.join(BACKUP_DIR, f));
      count++;
    }
  }
  if (count > 0) logger.info(`已清理 ${count} 个过期备份`);
  return count;
}
