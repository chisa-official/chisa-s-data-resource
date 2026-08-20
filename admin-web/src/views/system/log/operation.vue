<template>
  <div class="page-container">
    <PageHeader title="操作日志" subtitle="查看管理员操作记录" />

    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="模块名称">
          <el-input v-model="query.module" placeholder="请输入模块名称" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="操作时间">
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
        <el-table-column label="操作人" prop="adminName" min-width="110">
          <template #default="{ row }">{{ row.adminName || '—' }}</template>
        </el-table-column>
        <el-table-column label="模块" prop="module" min-width="120" />
        <el-table-column label="操作" prop="action" min-width="120" show-overflow-tooltip />
        <el-table-column label="请求方式" min-width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="methodTagType(row.method)" size="small" effect="plain">{{ row.method }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="请求地址" prop="url" min-width="220" show-overflow-tooltip />
        <el-table-column label="IP" prop="ip" min-width="130" />
        <el-table-column label="耗时(ms)" prop="costTime" min-width="100" align="right">
          <template #default="{ row }">
            <span :class="{ 'cost-slow': row.costTime > 1000 }">{{ row.costTime }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作时间" min-width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
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
import { getOperationLogs, type OperationLog, type OperationLogQueryParams } from '@/api/system/log';

const loading = ref(false);
const tableData = ref<OperationLog[]>([]);
const total = ref(0);
const dateRange = ref<[string, string] | null>(null);

const query = reactive({
  page: 1,
  pageSize: 10,
  module: '',
});

const methodTagMap: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  DELETE: 'danger',
  PATCH: 'info',
};

function methodTagType(method: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  return methodTagMap[method?.toUpperCase()] || 'info';
}

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('zh-CN');
}

function buildParams(): OperationLogQueryParams {
  const params: OperationLogQueryParams = { page: query.page, pageSize: query.pageSize };
  if (query.module) params.module = query.module;
  if (dateRange.value && dateRange.value.length === 2) {
    params.startDate = dateRange.value[0];
    params.endDate = dateRange.value[1];
  }
  return params;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await getOperationLogs(buildParams());
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
  query.module = '';
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

.cost-slow {
  color: #f56c6c;
  font-weight: 600;
}

:deep(.el-button .el-icon) {
  margin-right: 4px;
  vertical-align: middle;
}
</style>
