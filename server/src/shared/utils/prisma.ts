import { PrismaClient } from '@prisma/client';
import path from 'path';

// Prisma Client 单例，避免开发模式热重载产生多个连接
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// 上传与备份目录（相对 server 根）
export const UPLOAD_DIR = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
export const BACKUP_DIR = path.resolve(process.cwd(), process.env.BACKUP_DIR || 'backups');
export const LOG_DIR = path.resolve(process.cwd(), 'logs');
