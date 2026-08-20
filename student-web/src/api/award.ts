import { get, post } from './request';
import type { PageResult, Award, Discipline, AwardType } from '@shared-web/types';

export interface AwardApplyParams {
  type: AwardType;
  name: string;
  amount?: number;
  semester: string;
  attachments?: string[];
}

/** 我的奖助记录（按类型筛选） */
export function getMyAwards(type?: AwardType, page = 1, pageSize = 10): Promise<PageResult<Award>> {
  return get('/student/award', type ? { type, page, pageSize } : { page, pageSize });
}

/** 我的申请列表 */
export function getAwardApplies(page = 1, pageSize = 10): Promise<PageResult<Award>> {
  return get('/student/award/applies', { page, pageSize });
}

/** 提交奖助申请 */
export function applyAward(params: AwardApplyParams): Promise<Award> {
  return post('/student/award/apply', params);
}

/** 违纪记录（数组，非分页） */
export function getDisciplines(): Promise<Discipline[]> {
  return get('/student/discipline');
}
