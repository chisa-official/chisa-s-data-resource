<template>
  <el-breadcrumb class="breadcrumb" separator="/">
    <el-breadcrumb-item v-for="(item, idx) in items" :key="idx">{{ item }}</el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const items = computed(() => {
  // 优先使用路由 meta 中预计算的面包屑（扁平化路由后 route.matched 不再包含目录层级）
  if (route.meta?.breadcrumb) return route.meta.breadcrumb as string[];
  const matched = route.matched.filter((r) => r.meta?.title);
  return matched.map((r) => r.meta!.title as string);
});
</script>

<style scoped lang="scss">
.breadcrumb {
  font-size: $font-size-sm;
  color: $text-tertiary;

  :deep(.el-breadcrumb__separator) {
    color: $border-dark;
    margin: 0 $space-2;
  }

  :deep(.el-breadcrumb__item) {
    .el-breadcrumb__inner {
      color: $text-secondary;
      font-weight: $font-weight-medium;
      transition: color 0.2s;

      &:hover {
        color: $brand-primary;
      }
    }

    &:last-child .el-breadcrumb__inner {
      color: $text-primary;
      font-weight: $font-weight-semibold;
    }
  }
}
</style>
