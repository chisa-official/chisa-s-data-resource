<template>
  <div class="record-page">
    <PageHeader title="考勤记录" subtitle="查看个人考勤明细与出勤统计">
      <template #extra>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          value-format="YYYY-MM-DD"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          size="small"
          style="width: 260px"
          :clearable="true"
          @change="onDateChange"
        />
      </template>
    </PageHeader>

    <el-row :gutter="16" v-loading="statLoading">
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__value">{{ statistics?.total ?? 0 }}</div>
          <div class="stat-card__label">总课次</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__value stat-card__value--success">{{ statistics?.present ?? 0 }}</div>
          <div class="stat-card__label">出勤</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__value stat-card__value--danger">{{ statistics?.absent ?? 0 }}</div>
          <div class="stat-card__label">缺勤</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__value stat-card__value--warning">{{ statistics?.late ?? 0 }}</div>
          <div class="stat-card__label">迟到</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__value stat-card__value--primary">{{ statistics?.leave ?? 0 }}</div>
          <div class="stat-card__label">请假</div>
        </el-card>
      </el-col>
      <el-col :span="4">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-card__value stat-card__value--primary">{{ ratePercent }}%</div>
          <div class="stat-card__label">出勤率</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px" v-loading="loading">
      <template #header>
        <span>考勤明细</span>
      </template>
      <el-table :data="records" size="small" border style="width: 100%">
        <el-table-column label="日期" width="130">
          <template #default="{ row }">{{ formatDate(row.date) }}</template>
        </el-table-column>
        <el-table-column label="课程代码" width="120">
          <template #default="{ row }">{{ row.course?.code || '-' }}</template>
        </el-table-column>
        <el-table-column label="课程名称" min-width="180">
          <template #default="{ row }">{{ row.course?.name || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="attendanceTag(row.status)" size="small">{{ attendanceLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !records.length" description="暂无考勤记录" />
      <div v-if="pagination.total > pagination.pageSize" class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          :total="pagination.total"
          :page-size="pagination.pageSize"
          layout="prev, pager, next"
          small
          @current-change="fetchRecords"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { usePagination } from '@shared-web/composables/usePagination';
import { getAttendanceRecords, getAttendanceStatistics } from '@/api/attendance';
import type { AttendanceRecord, AttendanceStatistics, AttendanceStatus as AS } from '@shared-web/types';
import { formatDate } from '@shared-web/utils/format';

const loading = ref(false);
const statLoading = ref(false);
const records = ref<AttendanceRecord[]>([]);
const statistics = ref<AttendanceStatistics | null>(null);
const dateRange = ref<[string, string] | []>([]);
const { pagination } = usePagination(10);

const ratePercent = computed(() => {
  if (!statistics.value) return '0.0';
  return (statistics.value.rate ?? 0).toFixed(1);
});

function attendanceLabel(status: AS): string {
  const map: Record<AS, string> = {
    PRESENT: '出勤',
    ABSENT: '缺勤',
    LATE: '迟到',
    LEAVE: '请假',
  };
  return map[status] || status;
}

function attendanceTag(status: AS): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<AS, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    PRESENT: 'success',
    ABSENT: 'danger',
    LATE: 'warning',
    LEAVE: 'primary',
  };
  return map[status] || 'info';
}

function currentRange(): { startDate?: string; endDate?: string } {
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0]) {
    return { startDate: dateRange.value[0], endDate: dateRange.value[1] };
  }
  return {};
}

function onDateChange(): void {
  pagination.page = 1;
  fetchStatistics();
  fetchRecords();
}

async function fetchStatistics(): Promise<void> {
  statLoading.value = true;
  try {
    const { startDate, endDate } = currentRange();
    statistics.value = await getAttendanceStatistics(startDate, endDate);
  } catch {
    // ignore
  } finally {
    statLoading.value = false;
  }
}

async function fetchRecords(): Promise<void> {
  loading.value = true;
  try {
    const { startDate, endDate } = currentRange();
    const data = await getAttendanceRecords(startDate, endDate, pagination.page, pagination.pageSize);
    records.value = data.list;
    pagination.total = data.total;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchStatistics();
  fetchRecords();
});
</script>

<style scoped lang="scss">
.stat-card {
  text-align: center;
  :deep(.el-card__body) {
    padding: 16px;
  }
  &__value {
    font-size: 28px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    line-height: 1.2;
    &--success {
      color: var(--el-color-success);
    }
    &--danger {
      color: var(--el-color-danger);
    }
    &--warning {
      color: var(--el-color-warning);
    }
    &--primary {
      color: var(--el-color-primary);
    }
  }
  &__label {
    margin-top: 6px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
.pagination-wrap {
  margin-top: 16px;
  text-align: right;
}
</style>
