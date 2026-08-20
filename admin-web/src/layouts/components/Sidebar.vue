<template>
  <div class="sidebar">
    <div class="sidebar__logo">
      <el-icon size="24" color="#fff"><School /></el-icon>
      <span v-if="!collapsed">学生管理系统</span>
    </div>
    <el-scrollbar>
      <el-menu
        :default-active="activeMenu"
        :collapse="collapsed"
        :collapse-transition="false"
        background-color="#001529"
        text-color="rgba(255, 255, 255, 0.82)"
        active-text-color="#60a5fa"
        router
      >
        <SidebarItem
          v-for="menu in permissionStore.menus"
          :key="menu.id"
          :menu="menu"
        />
      </el-menu>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { School } from '@element-plus/icons-vue';
import { usePermissionStore } from '@/stores/permission';
import SidebarItem from './SidebarItem.vue';

interface Props {
  collapsed?: boolean;
}
defineProps<Props>();

const route = useRoute();
const permissionStore = usePermissionStore();
const activeMenu = computed(() => route.path);
</script>

<style scoped lang="scss">
.sidebar {
  height: 100vh;
  display: flex;
  flex-direction: column;

  &__logo {
    display: flex;
    align-items: center;
    gap: $space-2;
    height: $layout-header-height;
    padding: 0 $space-5;
    color: $text-inverse;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    background: rgba(255, 255, 255, 0.04);
    white-space: nowrap;
    overflow: hidden;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    .el-icon {
      color: $brand-primary-light;
      flex-shrink: 0;
    }
  }

  .el-scrollbar {
    flex: 1;
  }

  .el-menu {
    border-right: none;
    background: transparent;

    // 菜单项 hover / focus 态
    .el-menu-item,
    .el-sub-menu__title {
      color: rgba(255, 255, 255, 0.82);
      border-radius: 0 $radius-xl $radius-xl 0;
      margin: 0 $space-2 0 0;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: $text-inverse;
      }

      &.is-active {
        background: rgba(37, 99, 235, 0.18);
        color: $brand-primary-lighter;
      }
    }

    .el-sub-menu.is-active .el-sub-menu__title {
      color: $brand-primary-lighter;
    }
  }
}
</style>
