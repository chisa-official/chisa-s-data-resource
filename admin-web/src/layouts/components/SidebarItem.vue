<template>
  <!-- 按钮类型不渲染 -->
  <template v-if="menu.type !== 'BUTTON' && menu.visible">
    <el-sub-menu v-if="hasChildren" :index="fullPath">
      <template #title>
        <el-icon v-if="menu.icon"><component :is="iconComponent" /></el-icon>
        <span>{{ menu.name }}</span>
      </template>
      <SidebarItem
        v-for="child in menu.children"
        :key="child.id"
        :menu="child"
        :parent-path="fullPath"
      />
    </el-sub-menu>
    <el-menu-item v-else :index="fullPath">
      <el-icon v-if="menu.icon"><component :is="iconComponent" /></el-icon>
      <template #title>{{ menu.name }}</template>
    </el-menu-item>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import * as Icons from '@element-plus/icons-vue';
import type { Menu } from '@shared-web/types';

const props = defineProps<{ menu: Menu; parentPath?: string }>();

const hasChildren = computed(
  () => props.menu.children && props.menu.children.some((c) => c.type !== 'BUTTON' && c.visible),
);

// 完整路径：顶层菜单 path 通常以 / 开头；子菜单 path 是相对值，需拼接父路径
const fullPath = computed(() => {
  const p = props.menu.path;
  if (!p) return props.menu.id;
  if (p.startsWith('/')) return p;
  const parent = props.parentPath || '';
  if (!parent) return `/${p}`;
  return parent.endsWith('/') ? `${parent}${p}` : `${parent}/${p}`;
});

// 菜单 icon 字段映射到 Element Plus 图标组件
const iconComponent = computed(() => {
  if (!props.menu.icon) return null;
  return (Icons as any)[props.menu.icon] || Icons.Document;
});
</script>
