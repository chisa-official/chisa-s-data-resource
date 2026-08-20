import fs from 'fs';
import path from 'path';
import { FileStorage } from '@prisma/client';
import { ApiError } from '../error/ApiError';
import { UPLOAD_DIR } from '../utils/prisma';

export interface StorageProvider {
  upload(file: Buffer, key: string, mimeType: string): Promise<string>; // 返回访问路径
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getUrl(key: string): string;
}

/** 本地磁盘存储 */
export class LocalStorage implements StorageProvider {
  async upload(file: Buffer, key: string, _mimeType: string): Promise<string> {
    const absPath = path.join(UPLOAD_DIR, key);
    await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
    await fs.promises.writeFile(absPath, file);
    return key; // 返回相对路径
  }

  async download(key: string): Promise<Buffer> {
    const absPath = path.join(UPLOAD_DIR, key);
    if (!fs.existsSync(absPath)) throw ApiError.notFound('文件不存在');
    return fs.promises.readFile(absPath);
  }

  async delete(key: string): Promise<void> {
    const absPath = path.join(UPLOAD_DIR, key);
    if (fs.existsSync(absPath)) await fs.promises.unlink(absPath);
  }

  getUrl(key: string): string {
    return `/api/shared/files/local/${key}`;
  }
}

/** 阿里云 OSS 存储（预留实现，启用时配置 OSS_* 环境变量） */
export class OssStorage implements StorageProvider {
  async upload(_file: Buffer, key: string): Promise<string> {
    // 实际项目按需引入 ali-oss：const client = new OSS({ region, accessKeyId, accessKeySecret, bucket });
    throw new Error(`OSS 存储未启用，请配置 OSS_* 环境变量并实现 ${key} 上传逻辑`);
  }
  async download(_key: string): Promise<Buffer> {
    throw new Error('OSS 存储未启用');
  }
  async delete(_key: string): Promise<void> {
    throw new Error('OSS 存储未启用');
  }
  getUrl(_key: string): string {
    throw new Error('OSS 存储未启用');
  }
}

/** 根据环境变量切换存储实现 */
export function getStorageProvider(): StorageProvider {
  const type = process.env.STORAGE_TYPE as FileStorage | undefined;
  if (type === FileStorage.OSS) {
    return new OssStorage();
  }
  return new LocalStorage();
}

export const storageProvider = getStorageProvider();
