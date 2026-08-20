<template>
  <div class="change-page">
    <PageHeader title="学籍异动审批" subtitle="处理学生的休学/复学/转专业/退学申请" />

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 160px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-select v-model="query.type" placeholder="异动类型" clearable style="width: 140px" @change="onSearch">
          <el-option label="休学" value="SUSPEND" />
          <el-option label="复学" value="RESUME" />
          <el-option label="转专业" value="TRANSFER_MAJOR" />
          <el-option label="退学" value="DROP_OUT" />
        </el-select>
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
        <el-table-column label="异动类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="异动前状态" width="110" align="center">
          <template #default="{ row }">{{ statusText(row.beforeStatus) }}</template>
        </el-table-column>
        <el-table-column label="申请原因" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.reason.replace(/\s*\[目标专业ID: [^\]]+\]/, '') }}
          </template>
        </el-table-column>
        <el-table-column label="审批状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="applyTagType(row.status)">{{ applyText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">{{ row.createdAt?.replace('T', ' ').slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button type="success" link @click="onApprove(row)">通过</el-button>
              <el-button type="danger" link @click="onReject(row)">驳回</el-button>
            </template>
            <el-button type="info" link @click="onViewDetail(row)">详情</el-button>
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

    <el-dialog v-model="detailVisible" title="异动详情" width="560px">
      <el-descriptions v-if="current" :column="2" border>
        <el-descriptions-item label="学号">{{ current.student?.studentNo }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ current.student?.name }}</el-descriptions-item>
        <el-descriptions-item label="异动类型">{{ typeText(current.type) }}</el-descriptions-item>
        <el-descriptions-item label="异动前状态">{{ statusText(current.beforeStatus) }}</el-descriptions-item>
        <el-descriptions-item label="异动后状态">{{ current.afterStatus ? statusText(current.afterStatus) : '—' }}</el-descriptions-item>
        <el-descriptions-item label="审批状态">{{ applyText(current.status) }}</el-descriptions-item>
        <el-descriptions-item label="申请原因" :span="2">{{ current.reason.replace(/\s*\[目标专业ID: [^\]]+\]/, '') }}</el-descriptions-item>
        <el-descriptions-item v-if="current.attachmentUrl" label="附件" :span="2">
          <el-link type="primary" :href="current.attachmentUrl" target="_blank">查看附件</el-link>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间" :span="2">{{ current.createdAt?.replace('T', ' ').slice(0, 19) }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listStatusChanges,
  approveStatusChange,
  rejectStatusChange,
  type StatusChangeListResult,
} from '@/api/status';
import { ApplyStatus } from '@shared-web/types';

const loading = ref(false);
const list = ref<StatusChangeListResult[]>([]);
const detailVisible = ref(false);
const current = ref<StatusChangeListResult | null>(null);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  studentName: '',
  type: undefined as string | undefined,
  status: undefined as ApplyStatus | undefined,
});

const typeText = (t: string): string => ({ SUSPEND: '休学', RESUME: '复学', TRANSFER_MAJOR: '转专业', DROP_OUT: '退学' } as any)[t] || t;
const typeTagType = (t: string): 'info' | 'warning' | 'danger' | 'success' => {
  if (t === 'DROP_OUT') return 'danger';
  if (t === 'SUSPEND') return 'warning';
  if (t === 'RESUME') return 'success';
  return 'info';
};

const statusText = (s: string): string => ({ NORMAL: '在校', SUSPENDED: '休学', RESUMED: '复学', DROPPED: '退学', HELD_BACK: '留级', GRADUATED: '毕业' } as any)[s] || s;
const applyText = (s: ApplyStatus): string => ({ PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回' } as any)[s];
const applyTagType = (s: ApplyStatus): 'warning' | 'success' | 'danger' => (s === 'PENDING' ? 'warning' : s === 'APPROVED' ? 'success' : 'danger');

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listStatusChanges({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      type: query.type as any,
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
  query.type = undefined;
  query.status = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

async function onApprove(row: StatusChangeListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认通过「${row.student?.name}」的${typeText(row.type)}申请？通过后将自动更新学籍状态。`, '审批确认', { type: 'warning' });
    await approveStatusChange(row.id);
    ElMessage.success('审批通过');
    await loadData();
  } catch { /* cancel */ }
}

async function onReject(row: StatusChangeListResult): Promise<void> {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回', { inputType: 'textarea' });
    await rejectStatusChange(row.id, value);
    ElMessage.success('已驳回');
    await loadData();
  } catch { /* cancel */ }
}

function onViewDetail(row: StatusChangeListResult): void {
  current.value = row;
  detailVisible.value = true;
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.change-page {
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
