import { get, put } from '@shared-web/utils/request';
import type { PageResult, Feedback, FeedbackType, ApplyStatus } from '@shared-web/types';

export interface FeedbackResult extends Feedback {
  student?: { id: string; studentNo: string; name: string; department?: { name: string }; class?: { name: string } };
}

export function listFeedbacks(params: {
  page?: number;
  pageSize?: number;
  type?: FeedbackType;
  status?: ApplyStatus;
  studentNo?: string;
  studentName?: string;
}): Promise<PageResult<FeedbackResult>> {
  return get('/admin/feedbacks', params);
}

export function getFeedback(id: string): Promise<FeedbackResult> {
  return get(`/admin/feedbacks/${id}`);
}

export function replyFeedback(id: string, reply: string): Promise<Feedback> {
  return put(`/admin/feedbacks/${id}/reply`, { reply });
}
