<template>
  <div class="page-container">
    <PageHeader title="登录日志" subtitle="查看管理员登录记录" />

    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="用户名">
          <el-input v-model="query.username" placeholder="请输入用户名" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="成功" value="SUCCESS" />
            <el-option label="失败" value="FAIL" />
          </el-select>
        </el-form-item>
        <el-form-item label="登录时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon><span>查询</span>
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon><span>重置</span>
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <el-table v-loading="loading" :data="tableData" border stripe row-key="id">
        <el-table-column label="用户名" prop="username" min-width="120" />
        <el-table-column label="IP 地址" prop="ip" min-width="140" />
        <el-table-column label="登录地点" prop="location" min-width="120">
          <template #default="{ row }">{{ row.location || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'SUCCESS' ? 'success' : 'danger'" size="small">
              {{ row.status === 'SUCCESS' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提示信息" prop="message" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.message || '—' }}</template>
        </el-table-column>
        <el-table-column label="浏览器" prop="browser" min-width="120">
          <template #default="{ row }">{{ row.browser || '—' }}</template>
        </el-table-column>
        <el-table-column label="登录时间" min-width="170">
          <template #default="{ row }">{{ formatDate(row.loginAt) }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@shared-web/components/PageHeader.vue';
import { getLoginLogs, type LoginLog, type LogQueryParams } from '@/api/system/log';

const loading = ref(false);
const tableData = ref<LoginLog[]>([]);
const total = ref(0);
const dateRange = ref<[string, string] | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  username: '',
  status: '',
});

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('zh-CN');
}

function buildParams(): LogQueryParams {
  const params: LogQueryParams = { page: query.page, pageSize: query.pageSize };
  if (query.username) params.username = query.username;
  if (query.status) params.status = query.status;
  if (dateRange.value && dateRange.value.length === 2) {
    params.startDate = dateRange.value[0];
    params.endDate = dateRange.value[1];
  }
  return params;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await getLoginLogs(buildParams());
    tableData.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch(): void {
  query.page = 1;
  fetchList();
}

function handleReset(): void {
  query.username = '';
  query.status = '';
  dateRange.value = null;
  query.page = 1;
  fetchList();
}

function handleSizeChange(): void {
  query.page = 1;
  fetchList();
}

onMounted(() => {
  fetchList();
});
</script>

<style scoped lang="scss">
.page-container {
  .search-card {
    margin-bottom: 16px;
    :deep(.el-form--inline .el-form-item) {
      margin-bottom: 0;
    }
  }

  .table-card {
    .pagination-wrapper {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
  }
}

:deep(.el-button .el-icon) {
  margin-right: 4px;
  vertical-align: middle;
}
</style>
