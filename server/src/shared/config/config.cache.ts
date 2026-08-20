import { LRUCache } from 'lru-cache';
import { prisma } from '../utils/prisma';
import { ConfigType } from '@prisma/client';
import { logger } from '../logger/logger';

// 内存缓存：启动时预热，更新时同步刷新
const cache = new LRUCache<string, { value: any; type: ConfigType }>({ max: 1000 });

/** 按 type 解析配置值 */
function parseValue(raw: string, type: ConfigType): any {
  switch (type) {
    case ConfigType.NUMBER: return Number(raw);
    case ConfigType.BOOLEAN: return raw === 'true' || raw === '1';
    case ConfigType.JSON: return JSON.parse(raw);
    default: return raw;
  }
}

/** 读取单个配置（优先走缓存） */
export async function getConfig<T = any>(key: string): Promise<T | null> {
  const cached = cache.get(key);
  if (cached) return cached.value as T;
  const record = await prisma.systemConfig.findUnique({ where: { key } });
  if (!record) return null;
  const value = parseValue(record.value, record.type);
  cache.set(key, { value, type: record.type });
  return value as T;
}

/** 读取分组配置 */
export async function getConfigByGroup(group: string): Promise<Record<string, any>> {
  const records = await prisma.systemConfig.findMany({ where: { group } });
  const result: Record<string, any> = {};
  for (const r of records) {
    const value = parseValue(r.value, r.type);
    cache.set(r.key, { value, type: r.type });
    result[r.key] = value;
  }
  return result;
}

/** 更新配置并刷新缓存 */
export async function setConfig(key: string, value: any, updatedBy?: string): Promise<void> {
  const record = await prisma.systemConfig.findUnique({ where: { key } });
  if (!record) throw new Error(`配置项不存在: ${key}`);
  const raw = typeof value === 'object' ? JSON.stringify(value) : String(value);
  await prisma.systemConfig.update({
    where: { key },
    data: { value: raw, updatedBy },
  });
  cache.set(key, { value: parseValue(raw, record.type), type: record.type });
  logger.info(`配置已更新: ${key}`, { value });
}

/** 启动时加载全部配置到内存缓存 */
export async function initConfigs(): Promise<void> {
  const records = await prisma.systemConfig.findMany();
  for (const r of records) {
    cache.set(r.key, { value: parseValue(r.value, r.type), type: r.type });
  }
  logger.info(`配置缓存已预热: ${records.length} 项`);
}

/** 清空缓存（测试用） */
export function clearConfigCache(): void {
  cache.clear();
}
