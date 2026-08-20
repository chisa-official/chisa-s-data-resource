<template>
  <div class="list-page">
    <PageHeader title="考勤记录查询" subtitle="按学生/班级/课程/日期筛选考勤记录" />

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 120px" @keyup.enter="onSearch" />
        <el-select v-model="query.status" placeholder="考勤状态" clearable style="width: 120px" @change="onSearch">
          <el-option label="出勤" value="PRESENT" />
          <el-option label="缺勤" value="ABSENT" />
          <el-option label="迟到" value="LATE" />
          <el-option label="请假" value="LEAVE" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" @change="onDateChange" />
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column prop="student.studentNo" label="学号" width="120" />
        <el-table-column prop="student.name" label="姓名" width="100" />
        <el-table-column label="班级" width="140">
          <template #default="{ row }">{{ row.student?.class?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="课程" min-width="160">
          <template #default="{ row }">{{ row.course?.name || '—' }}（{{ row.course?.code || '—' }}）</template>
        </el-table-column>
        <el-table-column label="日期" width="120">
          <template #default="{ row }">{{ row.date?.replace('T', ' ').slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column label="考勤状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadData"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listAttendance, type AttendanceListResult } from '@/api/attendance';
import { AttendanceStatus } from '@shared-web/types';

const loading = ref(false);
const list = ref<AttendanceListResult[]>([]);
const dateRange = ref<[string, string] | null>(null);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  studentName: '',
  status: undefined as AttendanceStatus | undefined,
  startDate: '',
  endDate: '',
});

const statusText = (s: AttendanceStatus): string => ({ PRESENT: '出勤', ABSENT: '缺勤', LATE: '迟到', LEAVE: '请假' } as any)[s];
const statusTagType = (s: AttendanceStatus): 'success' | 'danger' | 'warning' | 'info' => {
  if (s === 'PRESENT') return 'success';
  if (s === 'ABSENT') return 'danger';
  if (s === 'LATE') return 'warning';
  return 'info';
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listAttendance({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      status: query.status,
      startDate: query.startDate || undefined,
      endDate: query.endDate || undefined,
    });
    list.value = res.list;
    pagination.total = res.total;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

function onDateChange(val: [string, string] | null): void {
  if (val) {
    query.startDate = val[0];
    query.endDate = val[1];
  } else {
    query.startDate = '';
    query.endDate = '';
  }
  onSearch();
}

function onSearch(): void {
  pagination.page = 1;
  loadData();
}

function onReset(): void {
  query.studentNo = '';
  query.studentName = '';
  query.status = undefined;
  query.startDate = '';
  query.endDate = '';
  dateRange.value = null;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.list-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
