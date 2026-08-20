import { get, post, put, del } from '@shared-web/utils/request';
import type { PageResult, Notice, NoticeScope } from '@shared-web/types';

// ========== 通知 CRUD ==========

export type NoticeResult = Notice;

export function listNotices(params: {
  page?: number;
  pageSize?: number;
  title?: string;
  scope?: NoticeScope;
  published?: boolean;
}): Promise<PageResult<NoticeResult>> {
  return get('/admin/notices', params);
}

export function getNotice(id: string): Promise<NoticeResult> {
  return get(`/admin/notices/${id}`);
}

export function createNotice(params: {
  title: string;
  content: string;
  scope: NoticeScope;
  targetId?: string;
  attachments?: string[];
  publishAt?: string;
}): Promise<NoticeResult> {
  return post('/admin/notices', params);
}

export function updateNotice(id: string, params: Partial<{
  title: string;
  content: string;
  scope: NoticeScope;
  targetId: string;
  attachments: string[];
  publishAt: string;
}>): Promise<NoticeResult> {
  return put(`/admin/notices/${id}`, params);
}

export function deleteNotice(id: string): Promise<void> {
  return del(`/admin/notices/${id}`);
}

export function publishNotice(id: string): Promise<NoticeResult> {
  return put(`/admin/notices/${id}/publish`);
}

// ========== 阅读统计 ==========

export interface ReadStatsResult {
  noticeId: string;
  title: string;
  scope: NoticeScope;
  published: boolean;
  publishAt: string;
  totalShouldRead: number;
  readCount: number;
  unreadCount: number;
  readRate: number;
}

export function getReadStats(id: string): Promise<ReadStatsResult> {
  return get(`/admin/notices/${id}/read-stats`);
}

export interface ReaderResult {
  id: string;
  studentNo: string;
  name: string;
  department?: { name: string };
  class?: { name: string };
  isRead: boolean;
  readAt: string | null;
}

export function getReaders(id: string, params: {
  page?: number;
  pageSize?: number;
  read?: boolean;
}): Promise<PageResult<ReaderResult>> {
  return get(`/admin/notices/${id}/readers`, params);
}
