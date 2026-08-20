import { prisma } from '../utils/prisma';
import { getConfig, getConfigByGroup, setConfig } from './config.cache';
import { ConfigType } from '@prisma/client';

export { getConfig, getConfigByGroup, setConfig, initConfigs } from './config.cache';

/** 公开配置（无需鉴权，前端启动即可获取） */
export async function getPublicConfigs(): Promise<Record<string, any>> {
  const keys = ['system.title', 'system.logo', 'system.login_bg'];
  const result: Record<string, any> = {};
  for (const k of keys) {
    const v = await getConfig(k);
    if (v !== null) result[k] = v;
  }
  return result;
}

/** 预置配置项（seed 时使用） */
export const DEFAULT_CONFIGS = [
  { key: 'system.title', value: '高校学生管理系统', name: '系统标题', group: 'system', type: ConfigType.STRING },
  { key: 'system.logo', value: '', name: 'Logo URL', group: 'system', type: ConfigType.STRING },
  { key: 'system.login_bg', value: '', name: '登录页背景', group: 'system', type: ConfigType.STRING },
  { key: 'selection.start', value: '2026-02-20 08:00', name: '选课开放时间', group: 'selection', type: ConfigType.STRING },
  { key: 'selection.end', value: '2026-02-25 18:00', name: '选课截止时间', group: 'selection', type: ConfigType.STRING },
  { key: 'attendance.warning_threshold', value: '3', name: '考勤预警阈值', group: 'attendance', type: ConfigType.NUMBER },
  { key: 'sms.enabled', value: 'false', name: '短信开关', group: 'sms', type: ConfigType.BOOLEAN },
  { key: 'backup.schedule', value: '0 2 * * *', name: '备份周期 cron', group: 'backup', type: ConfigType.STRING },
  { key: 'file.max_size', value: '10', name: '上传大小上限 MB', group: 'file', type: ConfigType.NUMBER },
] as const;

/** 初始化默认配置 */
export async function ensureDefaultConfigs(): Promise<void> {
  for (const cfg of DEFAULT_CONFIGS) {
    const existing = await prisma.systemConfig.findUnique({ where: { key: cfg.key } });
    if (!existing) {
      await prisma.systemConfig.create({ data: { ...cfg } as any });
    }
  }
}

// 兼容使用方命名
export const configService = { getConfig, getConfigByGroup, setConfig, getPublicConfigs };
