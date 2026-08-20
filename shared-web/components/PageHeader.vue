<template>
  <div class="page-header">
    <div class="page-header__left">
      <div v-if="$slots.icon || icon" class="page-header__icon">
        <slot name="icon">
          <el-icon :size="22"><component :is="iconComponent" /></el-icon>
        </slot>
      </div>
      <div class="page-header__text">
        <h2 class="page-header__title">{{ title }}</h2>
        <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div class="page-header__right">
      <slot name="extra" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import * as Icons from '@element-plus/icons-vue';

interface Props {
  title: string;
  subtitle?: string;
  /** 图标名（Element Plus 图标） */
  icon?: string;
}

const props = defineProps<Props>();

const iconComponent = computed(() => {
  if (!props.icon) return null;
  return (Icons as any)[props.icon] || Icons.Document;
});
</script>

<style scoped lang="scss">
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: $space-4 0;
  margin-bottom: $space-4;
  border-bottom: 1px solid $border-light;

  &__left {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  &__icon {
    @include flex-center;
    width: 40px;
    height: 40px;
    border-radius: $radius-lg;
    background: rgba(37, 99, 235, 0.08);
    color: $brand-primary;
    flex-shrink: 0;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: $space-1;
  }

  &__title {
    margin: 0;
    font-size: $font-size-xl;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    line-height: $line-height-tight;
  }

  &__subtitle {
    margin: 0;
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: $line-height-normal;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $space-3;
    flex-shrink: 0;
  }
}
</style>
