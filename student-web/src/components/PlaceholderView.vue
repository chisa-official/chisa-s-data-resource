<template>
  <div class="placeholder-view">
    <el-result icon="info" title="功能开发中" :sub-title="`${title} 模块将在后续阶段实现`">
      <template #extra>
        <el-tag type="info">阶段任务：{{ phase }}</el-tag>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title: string;
  phase?: string;
}
withDefaults(defineProps<Props>(), { phase: '学生端业务模块' });
</script>

<style scoped>
.placeholder-view {
  background: #fff;
  border-radius: 8px;
  padding: 40px;
}
</style>
