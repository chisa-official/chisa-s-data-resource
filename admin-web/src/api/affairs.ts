import { get, post, put, del } from '@shared-web/utils/request';
import type { PageResult, ApplyStatus, LeaveType, AwardType, DisciplineType } from '@shared-web/types';

// ========== 请假审批 ==========

export interface LeaveListResult {
  id: string;
  studentId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentUrl?: string;
  status: ApplyStatus;
  currentStep: number;
  approverId?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt?: string;
  student?: {
    id: string;
    studentNo: string;
    name: string;
    department?: { id: string; name: string };
    class?: { id: string; name: string };
  };
}

export function listLeaves(params: {
  page?: number;
  pageSize?: number;
  status?: ApplyStatus;
  type?: LeaveType;
  studentNo?: string;
  studentName?: string;
}): Promise<PageResult<LeaveListResult>> {
  return get('/admin/affairs/leaves', params);
}

export function approveLeave(id: string): Promise<LeaveListResult> {
  return put(`/admin/affairs/leaves/${id}/approve`);
}

export function forwardLeave(id: string): Promise<LeaveListResult> {
  return put(`/admin/affairs/leaves/${id}/forward`);
}

export function rejectLeave(id: string, reason?: string): Promise<LeaveListResult> {
  return put(`/admin/affairs/leaves/${id}/reject`, { reason });
}

// ========== 奖助贷项目 ==========

export interface AwardProject {
  id: string;
  name: string;
  awardType: AwardType;
  amount?: number;
  description?: string;
  sort: number;
}

export function listAwardProjects(): Promise<AwardProject[]> {
  return get('/admin/affairs/awards/projects');
}

export function createAwardProject(params: {
  name: string;
  awardType: AwardType;
  amount?: number;
  description?: string;
  sort?: number;
}): Promise<AwardProject> {
  return post('/admin/affairs/awards/projects', params);
}

export function updateAwardProject(id: string, params: Partial<{
  name: string;
  awardType: AwardType;
  amount: number;
  description: string;
  sort: number;
}>): Promise<AwardProject> {
  return put(`/admin/affairs/awards/projects/${id}`, params);
}

export function deleteAwardProject(id: string): Promise<void> {
  return del(`/admin/affairs/awards/projects/${id}`);
}

// ========== 奖助申请审核 ==========

export interface AwardApplyResult {
  id: string;
  studentId: string;
  type: AwardType;
  name: string;
  amount?: number;
  semester: string;
  status: ApplyStatus;
  attachments?: string[];
  result?: string;
  createdAt: string;
  updatedAt?: string;
  student?: {
    id: string;
    studentNo: string;
    name: string;
    department?: { name: string };
    class?: { name: string };
  };
}

export function listAwardApplies(params: {
  page?: number;
  pageSize?: number;
  status?: ApplyStatus;
  type?: AwardType;
  studentNo?: string;
  studentName?: string;
  semester?: string;
}): Promise<PageResult<AwardApplyResult>> {
  return get('/admin/affairs/awards/applies', params);
}

export function auditAward(id: string, data: { passed: boolean; result?: string }): Promise<AwardApplyResult> {
  return put(`/admin/affairs/awards/${id}/audit`, data);
}

export function publishAward(id: string): Promise<void> {
  return put(`/admin/affairs/awards/${id}/publish`);
}

export function batchPublishAward(ids: string[]): Promise<{ count: number }> {
  return put('/admin/affairs/awards/batch-publish', { ids });
}

// ========== 违纪处分 ==========

export interface DisciplineResult {
  id: string;
  studentId: string;
  type: DisciplineType;
  reason: string;
  occurredAt: string;
  createdAt?: string;
  student?: {
    id: string;
    studentNo: string;
    name: string;
    department?: { name: string };
    class?: { name: string };
  };
}

export function listDisciplines(params: {
  page?: number;
  pageSize?: number;
  type?: DisciplineType;
  studentNo?: string;
  studentName?: string;
}): Promise<PageResult<DisciplineResult>> {
  return get('/admin/affairs/disciplines', params);
}

export function createDiscipline(params: {
  studentId: string;
  type: DisciplineType;
  reason: string;
  occurredAt: string;
}): Promise<DisciplineResult> {
  return post('/admin/affairs/disciplines', params);
}

export function updateDiscipline(id: string, params: Partial<{
  type: DisciplineType;
  reason: string;
  occurredAt: string;
}>): Promise<DisciplineResult> {
  return put(`/admin/affairs/disciplines/${id}`, params);
}

export function deleteDiscipline(id: string): Promise<void> {
  return del(`/admin/affairs/disciplines/${id}`);
}

// ========== 评优评先（复用 Award 表 type=HONOR） ==========

export type HonorResult = AwardApplyResult;

export function listHonors(params: {
  page?: number;
  pageSize?: number;
  status?: ApplyStatus;
  studentNo?: string;
  studentName?: string;
  semester?: string;
}): Promise<PageResult<HonorResult>> {
  return get('/admin/affairs/honors', params);
}

export function grantHonor(params: {
  studentId: string;
  name: string;
  semester: string;
  result?: string;
  attachments?: string[];
}): Promise<HonorResult> {
  return post('/admin/affairs/honors', params);
}

export function auditHonor(id: string, data: { passed: boolean; result?: string }): Promise<HonorResult> {
  return put(`/admin/affairs/honors/${id}/audit`, data);
}
