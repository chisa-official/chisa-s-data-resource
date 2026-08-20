import { get, post } from './request';
import type {
  PageResult,
  Repair,
  Feedback,
  RepairType,
  FeedbackType,
} from '@shared-web/types';

export interface RepairParams {
  type: RepairType;
  location: string;
  description: string;
  images?: string[];
}

export interface FeedbackParams {
  type: FeedbackType;
  content: string;
}

/** 提交报修 */
export function createRepair(params: RepairParams): Promise<Repair> {
  return post('/student/feedback/repair', params);
}

/** 我的报修记录 */
export function getRepairList(page = 1, pageSize = 10): Promise<PageResult<Repair>> {
  return get('/student/feedback/repair', { page, pageSize });
}

/** 提交意见/投诉 */
export function createFeedback(params: FeedbackParams): Promise<Feedback> {
  return post('/student/feedback/feedback', params);
}

/** 我的反馈及回复 */
export function getFeedbackList(page = 1, pageSize = 10): Promise<PageResult<Feedback>> {
  return get('/student/feedback/feedback', { page, pageSize });
}
