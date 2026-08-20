import { get, post, put, del } from '@shared-web/utils/request';
import { downloadFile } from '@shared-web/utils/download';
import type { PageResult, Student, StatusChange, ApplyStatus, StatusChangeType, CertificateType } from '@shared-web/types';

// ========== 学生档案 ==========

export interface StudentListResult extends Omit<Student, 'department' | 'class'> {
  department?: { id: string; name: string };
  class?: { id: string; name: string };
}

export interface StudentListParams {
  page?: number;
  pageSize?: number;
  studentNo?: string;
  name?: string;
  departmentId?: string;
  classId?: string;
  status?: string;
}

export function listStudents(params: StudentListParams): Promise<PageResult<StudentListResult>> {
  return get('/admin/students', params);
}

export function getStudentDetail(id: string): Promise<Student> {
  return get(`/admin/students/${id}`);
}

export function createStudent(params: {
  studentNo: string;
  name: string;
  gender: string;
  departmentId: string;
  classId: string;
  phone?: string;
  email?: string;
  hometown?: string;
  address?: string;
  enrollDate?: string;
  password?: string;
}): Promise<Student> {
  return post('/admin/students', params);
}

export function updateStudent(id: string, params: Partial<{
  name: string;
  gender: string;
  departmentId: string;
  classId: string;
  phone: string;
  email: string;
  hometown: string;
  address: string;
  status: string;
  enrollDate: string | null;
  graduateDate: string | null;
}>): Promise<Student> {
  return put(`/admin/students/${id}`, params);
}

export function deleteStudent(id: string): Promise<{ softDeleted: boolean }> {
  return del(`/admin/students/${id}`);
}

export function resetStudentPassword(id: string, password?: string): Promise<{ defaultPassword: boolean }> {
  return put(`/admin/students/${id}/password`, { password });
}

export function exportStudents(params: StudentListParams): Promise<void> {
  return downloadFile('/admin/students/export', params, `students_${Date.now()}.xlsx`);
}

export function downloadStudentTemplate(): Promise<void> {
  return downloadFile('/admin/students/import/template', undefined, 'student_import_template.xlsx');
}

export function importStudents(file: File): Promise<{
  total: number;
  successCount: number;
  failCount: number;
  errors: { row: number; message: string }[];
}> {
  const formData = new FormData();
  formData.append('file', file);
  return post('/admin/students/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ========== 学籍异动审批 ==========

export interface StatusChangeListResult extends StatusChange {
  student?: {
    id: string;
    studentNo: string;
    name: string;
    department?: { id: string; name: string };
    class?: { id: string; name: string };
  };
}

export function listStatusChanges(params: {
  page?: number;
  pageSize?: number;
  status?: ApplyStatus;
  type?: StatusChangeType;
  studentNo?: string;
  studentName?: string;
}): Promise<PageResult<StatusChangeListResult>> {
  return get('/admin/status/changes', params);
}

export function approveStatusChange(id: string): Promise<StatusChange> {
  return put(`/admin/status/changes/${id}/approve`);
}

export function rejectStatusChange(id: string, reason?: string): Promise<StatusChange> {
  return put(`/admin/status/changes/${id}/reject`, { reason });
}

// ========== 信息修改审批 ==========

export interface InfoEditListResult {
  id: string;
  studentId: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  status: ApplyStatus;
  reviewerId?: string;
  reviewedAt?: string;
  createdAt: string;
  student?: {
    id: string;
    studentNo: string;
    name: string;
    department?: { name: string };
    class?: { name: string };
  };
}

export function listInfoEdits(params: {
  page?: number;
  pageSize?: number;
  status?: ApplyStatus;
  studentNo?: string;
  studentName?: string;
}): Promise<PageResult<InfoEditListResult>> {
  return get('/admin/status/info-edits', params);
}

export function approveInfoEdit(id: string): Promise<void> {
  return put(`/admin/status/info-edits/${id}/approve`);
}

export function rejectInfoEdit(id: string): Promise<void> {
  return put(`/admin/status/info-edits/${id}/reject`);
}

// ========== 证明申请 ==========

export interface CertificateListResult {
  id: string;
  studentId: string;
  type: CertificateType;
  purpose: string;
  status: ApplyStatus;
  fileUrl?: string;
  createdAt: string;
  student?: {
    id: string;
    studentNo: string;
    name: string;
    department?: { name: string };
    class?: { name: string };
  };
}

export function listCertificates(params: {
  page?: number;
  pageSize?: number;
  status?: ApplyStatus;
  type?: CertificateType;
  studentNo?: string;
  studentName?: string;
}): Promise<PageResult<CertificateListResult>> {
  return get('/admin/status/certificates', params);
}

export function generateCertificatePdf(id: string): Promise<CertificateListResult> {
  return put(`/admin/status/certificates/${id}/generate`);
}

// ========== 毕业审核 ==========

export interface GraduationAuditResult {
  id: string;
  studentNo: string;
  name: string;
  departmentName: string;
  className: string;
  majorName: string;
  expectedDuration: number;
  yearsStudied: number;
  totalCredits: number;
  requiredCredits: number;
  requiredTotalCredits: number;
  gpa: number;
  qualified: boolean;
  enrollDate?: string;
}

export function graduationAuditList(params: {
  page?: number;
  pageSize?: number;
  departmentId?: string;
  classId?: string;
  studentNo?: string;
  name?: string;
}): Promise<PageResult<GraduationAuditResult>> {
  return get('/admin/status/graduation/audit', params);
}

export function registerGraduation(studentId: string, result: 'GRADUATED' | 'COMPLETED' | 'LEFT'): Promise<void> {
  return put(`/admin/status/graduation/${studentId}`, { result });
}

export function batchRegisterGraduation(studentIds: string[], result: 'GRADUATED' | 'COMPLETED' | 'LEFT'): Promise<{ count: number }> {
  return put('/admin/status/graduation/batch', { studentIds, result });
}
