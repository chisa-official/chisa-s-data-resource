import { get, put } from './request';
import type { PageResult, Notice, NoticeScope } from '@shared-web/types';

/** 通知列表（按可见范围过滤） */
export function getNoticeList(params: {
  scope?: NoticeScope;
  page?: number;
  pageSize?: number;
}): Promise<PageResult<Notice>> {
  return get('/student/notice', params);
}

/** 通知详情（自动标记已读） */
export function getNoticeDetail(id: string): Promise<Notice> {
  return get(`/student/notice/${id}`);
}

/** 未读数 */
export function getUnreadCount(): Promise<{ count: number }> {
  return get('/student/notice/unread-count');
}

/** 标记已读 */
export function markNoticeRead(id: string): Promise<void> {
  return put(`/student/notice/${id}/read`);
}
