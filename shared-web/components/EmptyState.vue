<template>
  <div class="empty-state">
    <div class="empty-state__illustration" v-html="svgIllustration" />
    <p class="empty-state__description">{{ description }}</p>
    <div v-if="$slots.default" class="empty-state__action">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  description?: string;
  /** 空状态类型：list | search | error | forbidden */
  type?: 'list' | 'search' | 'error' | 'forbidden';
}

const props = withDefaults(defineProps<Props>(), {
  description: '暂无数据',
  type: 'list',
});

const svgIllustration = computed(() => {
  const map: Record<string, string> = {
    list: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="25" width="80" height="70" rx="8" fill="#f1f5f9"/>
      <path d="M38 48h44M38 66h44M38 84h28" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/>
      <circle cx="86" cy="86" r="18" fill="#e2e8f0"/>
      <path d="M78 86h16M86 78v16" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    search: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="55" cy="55" r="28" fill="none" stroke="#cbd5e1" stroke-width="5"/>
      <path d="M76 76l18 18" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/>
      <circle cx="55" cy="55" r="18" fill="#f1f5f9"/>
      <path d="M48 55h14M55 48v14" stroke="#94a3b8" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    error: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="40" fill="#fee2e2"/>
      <path d="M45 45l30 30M75 45l-30 30" stroke="#ef4444" stroke-width="5" stroke-linecap="round"/>
    </svg>`,
    forbidden: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="40" fill="#fef3c7"/>
      <path d="M42 42l36 36M78 42l-36 36" stroke="#f59e0b" stroke-width="5" stroke-linecap="round"/>
      <circle cx="60" cy="60" r="40" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="8 6"/>
    </svg>`,
  };
  return map[props.type] || map.list;
});
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $space-7 0;
  text-align: center;

  &__illustration {
    width: 120px;
    height: 120px;
    margin-bottom: $space-4;
    color: $text-tertiary;
  }

  &__description {
    margin: 0;
    font-size: $font-size-sm;
    color: $text-secondary;
    line-height: $line-height-normal;
  }

  &__action {
    margin-top: $space-4;
  }
}
</style>
