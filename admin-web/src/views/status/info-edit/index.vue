<template>
  <div class="info-edit-page">
    <PageHeader title="信息修改审批" subtitle="审批学生提交的个人信息修改申请" />

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 160px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-select v-model="query.status" placeholder="审批状态" clearable style="width: 140px" @change="onSearch">
          <el-option label="待审批" value="PENDING" />
          <el-option label="已通过" value="APPROVED" />
          <el-option label="已驳回" value="REJECTED" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column prop="student.studentNo" label="学号" width="120" />
        <el-table-column prop="student.name" label="姓名" width="100" />
        <el-table-column label="院系/班级" min-width="180">
          <template #default="{ row }">
            {{ row.student?.department?.name || '—' }} / {{ row.student?.class?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="修改字段" width="120" align="center">
          <template #default="{ row }">
            <el-tag>{{ fieldText(row.field) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="原值" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.oldValue || '（空）' }}</template>
        </el-table-column>
        <el-table-column label="新值" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ row.newValue || '（空）' }}</template>
        </el-table-column>
        <el-table-column label="审批状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="applyTagType(row.status)">{{ applyText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">{{ row.createdAt?.replace('T', ' ').slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button type="success" link @click="onApprove(row)">通过</el-button>
              <el-button type="danger" link @click="onReject(row)">驳回</el-button>
            </template>
            <span v-else style="color: #909399;">已处理</span>
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listInfoEdits,
  approveInfoEdit,
  rejectInfoEdit,
  type InfoEditListResult,
} from '@/api/status';
import { ApplyStatus } from '@shared-web/types';

const loading = ref(false);
const list = ref<InfoEditListResult[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  studentName: '',
  status: undefined as ApplyStatus | undefined,
});

const fieldText = (f: string): string => ({ phone: '手机号', email: '邮箱', hometown: '籍贯', address: '地址', photoUrl: '头像' } as any)[f] || f;
const applyText = (s: ApplyStatus): string => ({ PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回' } as any)[s];
const applyTagType = (s: ApplyStatus): 'warning' | 'success' | 'danger' => (s === 'PENDING' ? 'warning' : s === 'APPROVED' ? 'success' : 'danger');

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listInfoEdits({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      status: query.status,
    });
    list.value = res.list;
    pagination.total = res.total;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  pagination.page = 1;
  loadData();
}

function onReset(): void {
  query.studentNo = '';
  query.studentName = '';
  query.status = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

async function onApprove(row: InfoEditListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认通过「${row.student?.name}」的${fieldText(row.field)}修改申请？\n原值：${row.oldValue || '（空）'}\n新值：${row.newValue || '（空）'}`,
      '审批确认',
      { type: 'warning' },
    );
    await approveInfoEdit(row.id);
    ElMessage.success('审批通过，学生信息已更新');
    await loadData();
  } catch { /* cancel */ }
}

async function onReject(row: InfoEditListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认驳回「${row.student?.name}」的${fieldText(row.field)}修改申请？`, '驳回确认', { type: 'warning' });
    await rejectInfoEdit(row.id);
    ElMessage.success('已驳回');
    await loadData();
  } catch { /* cancel */ }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.info-edit-page {
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
