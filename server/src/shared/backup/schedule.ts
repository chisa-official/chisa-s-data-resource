import cron from 'node-cron';
import { backupDatabase, cleanExpiredBackups } from './mysql-backup';
import { getConfig } from '../config/config.cache';
import { logger } from '../logger/logger';

let scheduledTask: cron.ScheduledTask | null = null;

/** 注册定时备份任务，读取 backup.schedule 配置（默认每日凌晨 2 点） */
export async function scheduleBackup(): Promise<void> {
  if (scheduledTask) scheduledTask.stop();
  const cronExpr = (await getConfig('backup.schedule')) || '0 2 * * *';
  if (!cron.validate(cronExpr)) {
    logger.warn(`备份 cron 表达式无效: ${cronExpr}，跳过注册`);
    return;
  }
  scheduledTask = cron.schedule(cronExpr, async () => {
    try {
      logger.info('定时备份任务触发');
      await backupDatabase();
      await cleanExpiredBackups();
    } catch (e) {
      logger.error('定时备份失败', { error: e });
    }
  });
  logger.info(`定时备份任务已注册: ${cronExpr}`);
}

/** 停止定时备份 */
export function stopBackupSchedule(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
