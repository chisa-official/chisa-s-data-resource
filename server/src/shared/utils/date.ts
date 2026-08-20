import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';

dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.locale('zh-cn');

export { dayjs };

/** 格式化日期：YYYY-MM-DD HH:mm:ss */
export function formatDateTime(date: Date | string | number): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
}

/** 格式化日期：YYYY-MM-DD */
export function formatDate(date: Date | string | number): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/** 当前学期字符串，如 2025-2026-1 */
export function currentSemester(): string {
  const now = dayjs();
  const year = now.year();
  const month = now.month() + 1;
  // 8 月及以后为上学期
  const semester = month >= 8 ? 1 : 2;
  const startYear = semester === 1 ? year : year - 1;
  const endYear = startYear + 1;
  return `${startYear}-${endYear}-${semester}`;
}

/** 文件大小格式化 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
