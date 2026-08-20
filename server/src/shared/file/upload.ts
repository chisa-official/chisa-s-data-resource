import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { ApiError } from '../error/ApiError';
import { dayjs } from '../utils/date';

// 允许的 MIME 类型白名单
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'application/zip': 'zip',
};

export interface UploadOptions {
  /** 最大文件大小 MB，默认 10 */
  maxSizeMB?: number;
  /** 允许的 MIME 类型，默认白名单 */
  allowedMime?: string[];
  /** 最大文件数量，默认 10 */
  maxCount?: number;
  /** 业务类型，归类到子目录 avatar / leave_proof / notice_attach ... */
  bizType?: string;
}

/** 内存存储，便于统一写入 FileRecord 与切换 OSS */
export function createUploader(options: UploadOptions = {}) {
  const maxSize = (options.maxSizeMB ?? Number(process.env.FILE_MAX_SIZE_MB) ?? 10) * 1024 * 1024;
  const allowed = options.allowedMime ?? Object.keys(ALLOWED_MIME);

  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, cb) => {
      if (!allowed.includes(file.mimetype)) {
        return cb(ApiError.badRequest(`不支持的文件类型: ${file.mimetype}`));
      }
      cb(null, true);
    },
  });
}

/** 生成存储 key：{bizType}/{yyyy}/{mm}/{uuid}.{ext} */
export function generateStorageKey(originalname: string, bizType = 'common'): string {
  const ext = path.extname(originalname).toLowerCase() || '.bin';
  const now = dayjs();
  return `${bizType}/${now.format('YYYY')}/${now.format('MM')}/${randomUUID()}${ext}`;
}

export { ALLOWED_MIME };
