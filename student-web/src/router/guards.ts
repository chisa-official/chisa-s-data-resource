import type { Router } from 'vue-router';
import { useUserStore } from '@/stores/user';

/** 路由守卫：未登录访问受保护路由跳 /login；登录后访问 /login 跳首页 */
export function setupGuards(router: Router): void {
  router.beforeEach((to, _from, next) => {
    // 设置标题
    if (to.meta.title) {
      document.title = `${to.meta.title} - 学生端`;
    }

    const userStore = useUserStore();
    const isLogged = !!userStore.accessToken;

    if (to.meta.public) {
      // 已登录访问 /login 跳首页
      if (to.name === 'Login' && isLogged) {
        return next({ path: '/profile' });
      }
      return next();
    }

    // 受保护路由
    if (!isLogged) {
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }
    next();
  });
}
