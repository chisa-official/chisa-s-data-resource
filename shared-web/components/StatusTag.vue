<template>
  <el-tag
    :type="tagType"
    :effect="effect"
    size="small"
    class="status-tag"
    :class="`status-tag--${tagType}`"
  >{{ label }}</el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  status?: string;
  /** 显式指定类型（覆盖 status 映射） */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** 显式指定文本 */
  label?: string;
  effect?: 'light' | 'dark' | 'plain';
}

const props = withDefaults(defineProps<Props>(), { effect: 'light' });

// 申请状态 -> 颜色映射
const statusMap: Record<string, { type: 'primary' | 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
  PENDING: { type: 'warning', label: '待审批' },
  APPROVED: { type: 'success', label: '已通过' },
  REJECTED: { type: 'danger', label: '已驳回' },
  // 报修状态
  PENDING_REPAIR: { type: 'warning', label: '待处理' },
  PROCESSING: { type: 'primary', label: '处理中' },
  DONE: { type: 'success', label: '已完成' },
  // 学生状态
  NORMAL: { type: 'success', label: '在校' },
  SUSPENDED: { type: 'warning', label: '休学' },
  RESUMED: { type: 'primary', label: '复学' },
  DROPPED: { type: 'danger', label: '退学' },
  HELD_BACK: { type: 'warning', label: '留级' },
  GRADUATED: { type: 'info', label: '毕业' },
  // 账号状态
  ACTIVE: { type: 'success', label: '启用' },
  DISABLED: { type: 'danger', label: '禁用' },
};

const tagType = computed<'primary' | 'success' | 'warning' | 'danger' | 'info'>(() => {
  if (props.type) return props.type;
  if (props.status && statusMap[props.status]) return statusMap[props.status].type;
  return 'info';
});

const label = computed(() => {
  if (props.label) return props.label;
  if (props.status && statusMap[props.status]) return statusMap[props.status].label;
  return props.status || '';
});
</script>

<style scoped lang="scss">
.status-tag {
  height: 24px;
  padding: 0 $space-3;
  font-size: $font-size-xs;
  font-weight: $font-weight-medium;
  border-radius: $radius-md;
  border-width: 1px;

  &--primary {
    background: rgba(37, 99, 235, 0.08);
    border-color: rgba(37, 99, 235, 0.2);
    color: $brand-primary-dark;
  }

  &--success {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.2);
    color: #047857;
  }

  &--warning {
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.2);
    color: #b45309;
  }

  &--danger {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.2);
    color: #b91c1c;
  }

  &--info {
    background: rgba(100, 116, 139, 0.08);
    border-color: rgba(100, 116, 139, 0.2);
    color: $gray-8;
  }
}
</style>
