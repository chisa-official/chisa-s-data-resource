<template>
  <div class="discipline-page">
    <PageHeader title="违纪记录" subtitle="查看个人违纪记录" />

    <el-alert
      class="discipline-tip"
      title="违纪记录由学校录入，如有异议请联系辅导员"
      type="warning"
      :closable="false"
      show-icon
    />

    <el-card v-loading="loading">
      <el-table :data="records" size="small" border style="width: 100%">
        <el-table-column label="违纪类型" width="120">
          <template #default="{ row }">
            <el-tag :type="disciplineTag(row.type)" size="small">{{ disciplineLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原因" prop="reason" min-width="240" show-overflow-tooltip />
        <el-table-column label="发生时间" width="120">
          <template #default="{ row }">{{ formatDate(row.occurredAt) }}</template>
        </el-table-column>
        <el-table-column label="录入时间" width="120">
          <template #default="{ row }">{{ row.createdAt ? formatDate(row.createdAt) : '-' }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !records.length" description="暂无违纪记录" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { getDisciplines } from '@/api/award';
import type { Discipline, DisciplineType as DT } from '@shared-web/types';
import { formatDate } from '@shared-web/utils/format';

const loading = ref(false);
const records = ref<Discipline[]>([]);

function disciplineLabel(type: DT): string {
  const map: Record<DT, string> = {
    WARNING: '警告',
    SERIOUS_WARNING: '严重警告',
    DEMERIT: '记过',
    EXPEL: '开除',
  };
  return map[type] || type;
}

function disciplineTag(type: DT): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<DT, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    WARNING: 'warning',
    SERIOUS_WARNING: 'warning',
    DEMERIT: 'danger',
    EXPEL: 'danger',
  };
  return map[type] || 'info';
}

async function fetchRecords(): Promise<void> {
  loading.value = true;
  try {
    records.value = await getDisciplines();
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchRecords();
});
</script>

<style scoped lang="scss">
.discipline-tip {
  margin-bottom: 16px;
}
</style>
