import { get, post } from './request';
import type { PageResult, StatusChange, StudentStatus, Major } from '@shared-web/types';
import type { StatusChangeType, CertificateType } from '@shared-web/types';

export interface StudentStatusInfo {
  id: string;
  studentNo: string;
  name: string;
  gender: string;
  status: StudentStatus;
  enrollDate?: string;
  graduateDate?: string;
  department?: { id: string; name: string };
  class?: { id: string; name: string };
}

export interface CertificateApply {
  id: string;
  type: CertificateType;
  purpose: string;
  status: string;
  fileUrl?: string;
  createdAt: string;
}

export interface StatusChangeParams {
  type: StatusChangeType;
  reason: string;
  targetMajorId?: string;
}

export interface CertificateParams {
  type: CertificateType;
  purpose: string;
}

/** 当前学籍状态 */
export function getStatus(): Promise<StudentStatusInfo> {
  return get('/student/status');
}

/** 可选专业列表（转专业用，自动排除学生当前院系） */
export function getMajors(): Promise<(Major & { department?: { name: string } })[]> {
  return get('/student/status/majors');
}

/** 异动申请记录 */
export function listStatusChanges(page = 1, pageSize = 10): Promise<PageResult<StatusChange>> {
  return get('/student/status/changes', { page, pageSize });
}

/** 提交异动申请（含附件） */
export function applyStatusChange(params: StatusChangeParams, attachment?: File): Promise<StatusChange> {
  const formData = new FormData();
  formData.append('type', params.type);
  formData.append('reason', params.reason);
  if (params.targetMajorId) formData.append('targetMajorId', params.targetMajorId);
  if (attachment) formData.append('attachment', attachment);
  return post('/student/status/apply', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

/** 证明申请记录 */
export function listCertificates(page = 1, pageSize = 10): Promise<PageResult<CertificateApply>> {
  return get('/student/status/certificates', { page, pageSize });
}

/** 申请证明 */
export function applyCertificate(params: CertificateParams): Promise<{ id: string; fileUrl: string }> {
  return post('/student/status/certificate', params);
}

/** 证明 PDF 下载 URL */
export function getCertificateDownloadUrl(id: string): string {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  return `${baseURL}/student/status/certificate/${id}/download`;
}
