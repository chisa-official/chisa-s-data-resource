<template>
  <div class="leave-page">
    <PageHeader title="请假审批" subtitle="多级审批流转：辅导员 → 学工老师" />

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 150px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-select v-model="query.type" placeholder="请假类型" clearable style="width: 120px" @change="onSearch">
          <el-option label="事假" value="PERSONAL" />
          <el-option label="病假" value="SICK" />
        </el-select>
        <el-select v-model="query.status" placeholder="审批状态" clearable style="width: 130px" @change="onSearch">
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
        <el-table-column label="院系/班级" min-width="170">
          <template #default="{ row }">
            {{ row.student?.department?.name || '—' }} / {{ row.student?.class?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'SICK' ? 'danger' : 'info'" size="small">{{ row.type === 'SICK' ? '病假' : '事假' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="请假时间" min-width="200">
          <template #default="{ row }">
            {{ row.startDate?.replace('T', ' ').slice(0, 16) }} ~ {{ row.endDate?.replace('T', ' ').slice(0, 16) }}
          </template>
        </el-table-column>
        <el-table-column label="原因" min-width="180" show-overflow-tooltip prop="reason" />
        <el-table-column label="审批进度" width="160" align="center">
          <template #default="{ row }">
            <el-steps v-if="row.status === 'PENDING'" :active="row.currentStep" finish-status="success" simple>
              <el-step title="辅导员" />
              <el-step title="学工" />
            </el-steps>
            <el-tag v-else :type="row.status === 'APPROVED' ? 'success' : 'danger'" size="small">
              {{ row.status === 'APPROVED' ? '已通过' : '已驳回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'PENDING'">
              <el-button type="success" link :icon="Check" @click="onApprove(row)">通过</el-button>
              <el-button v-if="row.currentStep === 0" type="warning" link :icon="Sort" @click="onForward(row)">转交学工</el-button>
              <el-button type="danger" link :icon="Close" @click="onReject(row)">驳回</el-button>
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

    <el-dialog v-model="detailVisible" title="请假详情" width="560px">
      <el-descriptions v-if="current" :column="2" border>
        <el-descriptions-item label="学号">{{ current.student?.studentNo }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ current.student?.name }}</el-descriptions-item>
        <el-descriptions-item label="请假类型">{{ current.type === 'SICK' ? '病假' : '事假' }}</el-descriptions-item>
        <el-descriptions-item label="审批状态">{{ applyText(current.status) }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ current.startDate?.replace('T', ' ').slice(0, 16) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ current.endDate?.replace('T', ' ').slice(0, 16) }}</el-descriptions-item>
        <el-descriptions-item label="请假原因" :span="2">{{ current.reason }}</el-descriptions-item>
        <el-descriptions-item v-if="current.attachmentUrl" label="附件" :span="2">
          <el-link type="primary" :href="current.attachmentUrl" target="_blank">查看附件</el-link>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Check, Close, Sort } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listLeaves, approveLeave, forwardLeave, rejectLeave, type LeaveListResult } from '@/api/affairs';
import { ApplyStatus } from '@shared-web/types';

const loading = ref(false);
const list = ref<LeaveListResult[]>([]);
const detailVisible = ref(false);
const current = ref<LeaveListResult | null>(null);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  studentName: '',
  type: undefined as string | undefined,
  status: undefined as ApplyStatus | undefined,
});

const applyText = (s: ApplyStatus): string => ({ PENDING: '待审批', APPROVED: '已通过', REJECTED: '已驳回' } as any)[s];

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listLeaves({
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

async function onApprove(row: LeaveListResult): Promise<void> {
  const stepText = row.currentStep === 0 ? '辅导员审批' : '学工审批';
  try {
    await ElMessageBox.confirm(`确认通过「${row.student?.name}」的请假申请（当前节点：${stepText}）？`, '审批确认', { type: 'warning' });
    await approveLeave(row.id);
    ElMessage.success('审批通过');
    await loadData();
  } catch { /* cancel */ }
}

async function onForward(row: LeaveListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认将「${row.student?.name}」的请假申请转交学工老师审批？`, '转交确认', { type: 'info' });
    await forwardLeave(row.id);
    ElMessage.success('已转交学工老师');
    await loadData();
  } catch { /* cancel */ }
}

async function onReject(row: LeaveListResult): Promise<void> {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回', { inputType: 'textarea' });
    await rejectLeave(row.id, value);
    ElMessage.success('已驳回');
    await loadData();
  } catch { /* cancel */ }
}

function onViewDetail(row: LeaveListResult): void {
  current.value = row;
  detailVisible.value = true;
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.leave-page {
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
