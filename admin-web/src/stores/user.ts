import { defineStore } from 'pinia';
import { ref } from 'vue';
import { post, get } from '@shared-web/utils/request';
import type { Admin } from '@shared-web/types';

interface LoginParams {
  username: string;
  password: string;
}

export const useUserStore = defineStore(
  'user',
  () => {
    const adminInfo = ref<Admin | null>(null);
    const permissions = ref<string[]>([]);
    const accessToken = ref<string>(localStorage.getItem('accessToken') || '');
    const refreshToken = ref<string>(localStorage.getItem('refreshToken') || '');

    async function login(payload: LoginParams): Promise<void> {
      const data = await post<{ accessToken: string; refreshToken: string; admin: Admin }>(
        '/admin/auth/login',
        payload,
      );
      accessToken.value = data.accessToken;
      refreshToken.value = data.refreshToken;
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      adminInfo.value = data.admin;
    }

    async function fetchAdminInfo(): Promise<void> {
      const data = await get<Admin & { permissions: string[] }>('/admin/auth/info');
      adminInfo.value = data;
      permissions.value = data.permissions || [];
    }

    async function logout(): Promise<void> {
      try {
        await post('/auth/logout', { refreshToken: refreshToken.value });
      } catch {
        // ignore
      }
      adminInfo.value = null;
      permissions.value = [];
      accessToken.value = '';
      refreshToken.value = '';
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }

    return { adminInfo, permissions, accessToken, refreshToken, login, fetchAdminInfo, logout };
  },
  {
    persist: {
      paths: ['adminInfo'],
    },
  },
);
