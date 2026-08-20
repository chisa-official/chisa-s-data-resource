import { usePermissionStore } from '@/stores/permission';

/** 按钮级权限判断 */
export function usePermission() {
  const permissionStore = usePermissionStore();

  function hasPermission(perm: string): boolean {
    // 超级管理员拥有所有权限
    if (permissionStore.permissions.includes('*')) return true;
    return permissionStore.permissions.includes(perm);
  }

  return { hasPermission };
}
