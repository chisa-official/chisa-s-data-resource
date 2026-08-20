import type { Router } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { usePermissionStore } from '@/stores/permission';
import { fallbackRoute } from './staticRoutes';

/** 路由守卫：登录校验 + 动态路由注册 */
export function setupGuards(router: Router): void {
  router.beforeEach(async (to, _from, next) => {
    if (to.meta.title) {
      document.title = `${to.meta.title} - 后台管理`;
    }

    const userStore = useUserStore();
    const permissionStore = usePermissionStore();
    const isLogged = !!userStore.accessToken;

    if (to.meta.public) {
      if (to.name === 'Login' && isLogged) {
        return next({ path: '/' });
      }
      return next();
    }

    if (!isLogged) {
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }

    // 首次进入：拉取用户信息 + 动态注册路由 + 注册兜底路由
    if (!permissionStore.isRoutesLoaded) {
      try {
        if (!userStore.adminInfo) {
          await userStore.fetchAdminInfo();
        }
        permissionStore.setPermissions(userStore.permissions);
        await permissionStore.loadMenus();
        const dynamicRoutes = permissionStore.generateRoutes();
        dynamicRoutes.forEach((r) => router.addRoute(r));
        // 动态路由加载完成后再加入兜底 404，避免未登录时提前匹配 fallback
        router.addRoute(fallbackRoute);
        // 重新跳转，让动态路由生效
        return next({ ...to, replace: true });
      } catch (e) {
        await userStore.logout();
        return next({ path: '/login' });
      }
    }

    next();
  });
}
