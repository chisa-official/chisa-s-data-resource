import { defineStore } from 'pinia';
import { ref } from 'vue';
import { post, get } from '@shared-web/utils/request';
import type { Student } from '@shared-web/types';

interface LoginParams {
  studentNo: string;
  password: string;
}

export const useUserStore = defineStore(
  'user',
  () => {
    const studentInfo = ref<Student | null>(null);
    const accessToken = ref<string>(localStorage.getItem('accessToken') || '');
    const refreshToken = ref<string>(localStorage.getItem('refreshToken') || '');
    /** 账号是否处于待分配状态（注册后尚未分配真实班级） */
    const pendingAssign = ref<boolean>(false);

    async function login(payload: LoginParams): Promise<void> {
      const data = await post<{ accessToken: string; refreshToken: string; student: Student; pendingAssign?: boolean }>(
        '/student/auth/login',
        payload,
      );
      accessToken.value = data.accessToken;
      refreshToken.value = data.refreshToken;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      studentInfo.value = data.student;
      pendingAssign.value = !!data.pendingAssign;
    }

    async function fetchStudentInfo(): Promise<void> {
      const data = await get<Student>('/student/profile');
      studentInfo.value = data;
    }

    async function logout(): Promise<void> {
      try {
        await post('/student/auth/logout', { refreshToken: refreshToken.value });
      } catch {
        // ignore
      }
      studentInfo.value = null;
      accessToken.value = '';
      refreshToken.value = '';
      pendingAssign.value = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }

    return { studentInfo, accessToken, refreshToken, pendingAssign, login, fetchStudentInfo, logout };
  },
  {
    persist: {
      paths: ['studentInfo'],
    },
  },
);
