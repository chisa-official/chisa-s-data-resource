import { computed } from 'vue';

/** 登录态判断、token 管理（学生端/后台端通用） */
export function useAuth() {
  const accessToken = computed(() => localStorage.getItem('accessToken') || '');
  const refreshToken = computed(() => localStorage.getItem('refreshToken') || '');
  const isLoggedIn = computed(() => !!accessToken.value);

  function setTokens(access: string, refresh: string): void {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }

  function clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /** 监听全局登出事件（request.ts 中 401 刷新失败时触发） */
  function onLogout(cb: () => void): () => void {
    const handler = () => cb();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }

  return {
    accessToken,
    refreshToken,
    isLoggedIn,
    setTokens,
    clearTokens,
    onLogout,
  };
}
