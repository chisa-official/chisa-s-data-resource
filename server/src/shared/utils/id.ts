import { randomUUID } from 'crypto';

/** 生成 UUID */
export function uuid(): string {
  return randomUUID();
}
