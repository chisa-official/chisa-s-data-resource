<template>
  <div class="repair-page">
    <PageHeader title="报修工单处理" subtitle="处理学生提交的宿舍/教室报修工单" />

    <el-card>
      <div class="search-bar">
        <el-select v-model="query.status" placeholder="工单状态" clearable style="width: 130px" @change="onSearch">
          <el-option label="待处理" value="PENDING" />
          <el-option label="处理中" value="PROCESSING" />
          <el-option label="已完成" value="DONE" />
        </el-select>
        <el-select v-model="query.type" placeholder="报修类型" clearable style="width: 130px" @change="onSearch">
          <el-option label="宿舍" value="DORM" />
          <el-option label="教室" value="CLASSROOM" />
        </el-select>
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 120px" @keyup.enter="onSearch" />
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column label="学生" min-width="150">
          <template #default="{ row }">
            {{ row.student?.studentNo }} - {{ row.student?.name }}
          </template>
        </el-table-column>
        <el-table-column label="院系/班级" min-width="160">
          <template #default="{ row }">
            {{ row.student?.department?.name || '—' }} / {{ row.student?.class?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.type === 'DORM' ? 'warning' : 'info'">{{ row.type === 'DORM' ? '宿舍' : '教室' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="位置" prop="location" width="140" show-overflow-tooltip />
        <el-table-column label="故障描述" prop="description" min-width="200" show-overflow-tooltip />
        <el-table-column label="图片" width="100" align="center">
          <template #default="{ row }">
            <el-image
              v-if="row.images && row.images.length"
              :src="row.images[0]"
              :preview-src-list="row.images"
              fit="cover"
              style="width: 40px; height: 40px"
              preview-teleported
            />
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理结果" prop="result" min-width="160" show-overflow-tooltip />
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ row.createdAt?.replace('T', ' ').slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'PENDING'" type="primary" link @click="onStart(row)">开始处理</el-button>
            <el-button v-else-if="row.status === 'PROCESSING'" type="success" link @click="onComplete(row)">完成</el-button>
            <span v-else class="text-muted">已完结</span>
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

    <el-dialog v-model="completeVisible" title="完成工单" width="480px">
      <el-form :model="completeForm" label-width="90px">
        <el-form-item label="处理结果">
          <el-input v-model="completeForm.result" type="textarea" :rows="3" placeholder="请输入处理结果说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="completeVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitComplete">确认完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listRepairs, handleRepair, type RepairResult } from '@/api/dorm';
import { RepairStatus } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<RepairResult[]>([]);
const completeVisible = ref(false);
const currentId = ref('');

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  status: undefined as RepairStatus | undefined,
  type: undefined as string | undefined,
  studentNo: '',
  studentName: '',
});

const completeForm = reactive({ result: '' });

function statusText(s: RepairStatus): string {
  return ({ PENDING: '待处理', PROCESSING: '处理中', DONE: '已完成' } as any)[s];
}

function statusTagType(s: RepairStatus): 'info' | 'warning' | 'success' {
  if (s === 'PENDING') return 'info';
  if (s === 'PROCESSING') return 'warning';
  return 'success';
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listRepairs({
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: query.status,
      type: query.type as any,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
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
  query.status = undefined;
  query.type = undefined;
  query.studentNo = '';
  query.studentName = '';
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

async function onStart(row: RepairResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认开始处理「${row.student?.name}」的报修工单？`, '开始处理', { type: 'info' });
    await handleRepair(row.id, { status: 'PROCESSING' });
    ElMessage.success('已开始处理');
    await loadData();
  } catch { /* cancel */ }
}

function onComplete(row: RepairResult): void {
  currentId.value = row.id;
  completeForm.result = '';
  completeVisible.value = true;
}

async function onSubmitComplete(): Promise<void> {
  submitting.value = true;
  try {
    await handleRepair(currentId.value, { status: 'DONE', result: completeForm.result || undefined });
    ElMessage.success('工单已完成');
    completeVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.repair-page {
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
.text-muted {
  color: var(--el-text-color-secondary);
}
</style>
