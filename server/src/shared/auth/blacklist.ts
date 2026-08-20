import { LRUCache } from 'lru-cache';

// Token 黑名单（登出失效），TTL = Token 剩余有效期
// LRU 缓存避免无限增长，单进程方案；多实例部署可改用 Redis
const blacklist = new LRUCache<string, boolean>({
  max: 10000,
  ttl: 2 * 60 * 60 * 1000, // 2h（与 Access Token 有效期一致）
});

/** 加入黑名单 */
export function blacklistToken(token: string, ttlMs?: number): void {
  if (ttlMs && ttlMs > 0) {
    blacklist.set(token, true, { ttl: ttlMs });
  } else {
    blacklist.set(token, true);
  }
}

/** 检查是否在黑名单 */
export function isBlacklisted(token: string): boolean {
  return blacklist.has(token);
}
