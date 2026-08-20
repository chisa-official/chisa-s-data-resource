import { post } from './request';
import type { Student } from '@shared-web/types';

export interface LoginParams {
  studentNo: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  student: Student;
  /** 是否处于待分配状态（注册后尚未分配真实班级） */
  pendingAssign?: boolean;
}

export interface RegisterParams {
  studentNo: string;
  password: string;
  confirmPassword: string;
  name: string;
  gender: 'MALE' | 'FEMALE';
  phone?: string;
  email?: string;
}

/** 学生注册 */
export function register(params: RegisterParams): Promise<{ id: string; studentNo: string }> {
  return post('/student/auth/register', params);
}

/** 学号 + 密码登录 */
export function login(params: LoginParams): Promise<LoginResult> {
  return post<LoginResult>('/student/auth/login', params);
}

/** 刷新 Token */
export function refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  return post('/student/auth/refresh', { refreshToken });
}

/** 登出 */
export function logout(refreshToken: string): Promise<void> {
  return post('/student/auth/logout', { refreshToken });
}
