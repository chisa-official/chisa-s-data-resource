import type { RouteRecordRaw } from 'vue-router';

// 静态路由：登录、注册、404、无权限页
export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { public: true, title: '管理员登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/register/index.vue'),
    meta: { public: true, title: '管理员注册' },
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/error/403.vue'),
    meta: { public: true, title: '无权限' },
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/error/404.vue'),
    meta: { public: true, title: '页面不存在' },
  },
  {
    path: '/redirect/:path(.*)*',
    name: 'Redirect',
    redirect: (to) => {
      const segments = Array.isArray(to.params.path) ? to.params.path : [to.params.path];
      return `/${segments.join('/')}`;
    },
    meta: { public: true },
  },
];

// 动态路由占位：根据后端返回的菜单树动态注册
// 此处定义 component 映射，供动态路由匹配
const modules = import.meta.glob('@/views/**/*.vue');

/** 根据菜单 component 字段映射到具体 vue 文件 */
export function resolveComponent(component: string): any {
  const path = `/src/views/${component}.vue`;
  return modules[path] || (() => import('@/views/error/404.vue'));
}

/** 兜底重定向路由（动态路由注册完成后保留） */
export const fallbackRoute: RouteRecordRaw = {
  path: '/:pathMatch(.*)*',
  name: 'Fallback',
  redirect: '/404',
};
