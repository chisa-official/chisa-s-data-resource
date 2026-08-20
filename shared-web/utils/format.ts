import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

export { dayjs };

/** 日期时间格式化：YYYY-MM-DD HH:mm:ss */
export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '';
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}

/** 日期格式化：YYYY-MM-DD */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '';
  return dayjs(value).format('YYYY-MM-DD');
}

/** 相对时间：3 小时前 */
export function formatRelative(value?: string | Date | null): string {
  if (!value) return '';
  return dayjs(value).fromNow();
}

/** 文件大小格式化 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/** 金额格式化（保留 2 位） */
export function formatMoney(value?: number | null): string {
  if (value === null || value === undefined) return '';
  return `¥${value.toFixed(2)}`;
}

/** 状态标签颜色映射 */
export function applyStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
  };
  return map[status] || 'info';
}
