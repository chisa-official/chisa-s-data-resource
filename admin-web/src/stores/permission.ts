import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RouteRecordRaw } from 'vue-router';
import { get } from '@shared-web/utils/request';
import { MenuType } from '@shared-web/types';
import type { Menu } from '@shared-web/types';
import { resolveComponent } from '@/router/staticRoutes';

/** 动态路由表：根据后端返回的菜单树生成 */
export const usePermissionStore = defineStore('permission', () => {
  const menus = ref<Menu[]>([]);
  const permissions = ref<string[]>([]);
  const isRoutesLoaded = ref(false);

  async function loadMenus(): Promise<void> {
    const data = await get<Menu[]>('/admin/auth/menus');
    menus.value = data;
  }

  function setPermissions(perms: string[]): void {
    permissions.value = perms;
  }

  /** 将菜单树扁平化为 AdminLayout 的直接子路由 */
  function generateRoutes(): RouteRecordRaw[] {
    const rootChildren: RouteRecordRaw[] = [];

    // 递归扁平化：DIRECTORY 仅用于侧边栏分组，不生成路由
    function flatten(menuList: Menu[], parentPath: string, breadcrumbNames: string[]): void {
      for (const menu of menuList) {
        if (menu.type === MenuType.BUTTON) continue;

        const fullPath = menu.path?.startsWith('/')
          ? menu.path
          : `${parentPath === '/' ? '' : parentPath}/${menu.path || ''}`;

        if (menu.type === MenuType.MENU && menu.component) {
          rootChildren.push({
            path: fullPath,
            name: fullPath,
            component: resolveComponent(menu.component),
            meta: {
              title: menu.name,
              icon: menu.icon,
              permission: menu.permission,
              breadcrumb: [...breadcrumbNames, menu.name],
            },
          } as RouteRecordRaw);
        }

        if (menu.children && menu.children.length > 0) {
          flatten(menu.children, fullPath, [...breadcrumbNames, menu.name]);
        }
      }
    }

    flatten(menus.value, '/', []);

    // 首页仪表盘作为默认落地页
    rootChildren.unshift({
      path: '/dashboard',
      name: 'Dashboard',
      component: resolveComponent('dashboard/index'),
      meta: { title: '首页', icon: 'HomeFilled', breadcrumb: ['首页'] },
    } as RouteRecordRaw);

    isRoutesLoaded.value = true;

    // 整体包在 AdminLayout 下
    const rootRoute: RouteRecordRaw = {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      redirect: '/dashboard',
      children: rootChildren,
    };

    return [rootRoute];
  }

  function reset(): void {
    menus.value = [];
    permissions.value = [];
    isRoutesLoaded.value = false;
  }

  return { menus, permissions, isRoutesLoaded, loadMenus, setPermissions, generateRoutes, reset };
});
