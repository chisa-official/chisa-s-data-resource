import { get, post, put } from './request';
import type { Student, PageResult } from '@shared-web/types';

export interface InfoEditParams {
  field: 'phone' | 'email' | 'hometown' | 'address';
  newValue: string;
}

export interface InfoEditApply {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  status: string;
  createdAt: string;
}

export interface ChangePasswordParams {
  oldPassword: string;
  newPassword: string;
}

/** 获取个人档案 */
export function getProfile(): Promise<Student> {
  return get<Student>('/student/profile');
}

/** 提交信息修改申请 */
export function submitInfoEdit(params: InfoEditParams): Promise<{ id: string; status: string }> {
  return put('/student/profile/info-edit', params);
}

/** 修改申请记录列表 */
export function listInfoEdits(page = 1, pageSize = 10): Promise<PageResult<InfoEditApply>> {
  return get('/student/profile/info-edits', { page, pageSize });
}

/** 修改密码 */
export function changePassword(params: ChangePasswordParams): Promise<void> {
  return put('/student/profile/password', params);
}

/** 上传头像 */
export function uploadAvatar(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  return post('/student/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}
