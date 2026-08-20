<template>
  <div class="audit-page">
    <PageHeader title="奖助申请审核" subtitle="审核学生提交的奖学金/助学金/贷款申请材料" />

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-select v-model="query.type" placeholder="项目类型" clearable style="width: 130px" @change="onSearch">
          <el-option label="奖学金" value="SCHOLARSHIP" />
          <el-option label="助学金" value="AID" />
          <el-option label="助学贷款" value="LOAN" />
          <el-option label="评优" value="HONOR" />
        </el-select>
        <el-select v-model="query.status" placeholder="审核状态" clearable style="width: 130px" @change="onSearch">
          <el-option label="待审核" value="PENDING" />
          <el-option label="已通过" value="APPROVED" />
          <el-option label="已驳回" value="REJECTED" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column prop="student.studentNo" label="学号" width="120" />
        <el-table-column prop="student.name" label="姓名" width="100" />
        <el-table-column label="院系/班级" min-width="160">
          <template #default="{ row }">
            {{ row.student?.department?.name || '—' }} / {{ row.student?.class?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="项目名称" prop="name" min-width="160" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100" align="right">
          <template #default="{ row }">{{ row.amount != null ? '¥' + row.amount : '—' }}</template>
        </el-table-column>
        <el-table-column label="学期" prop="semester" width="120" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="applyTagType(row.status)" size="small">{{ applyText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="info" link @click="onViewDetail(row)">详情</el-button>
            <template v-if="row.status === 'PENDING'">
              <el-button type="success" link :icon="Check" @click="onAudit(row, true)">通过</el-button>
              <el-button type="danger" link :icon="Close" @click="onAudit(row, false)">驳回</el-button>
            </template>
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

    <el-dialog v-model="detailVisible" title="申请详情" width="600px">
      <el-descriptions v-if="current" :column="2" border>
        <el-descriptions-item label="学号">{{ current.student?.studentNo }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ current.student?.name }}</el-descriptions-item>
        <el-descriptions-item label="项目名称">{{ current.name }}</el-descriptions-item>
        <el-descriptions-item label="项目类型">{{ typeText(current.type) }}</el-descriptions-item>
        <el-descriptions-item label="金额">{{ current.amount != null ? '¥' + current.amount : '—' }}</el-descriptions-item>
        <el-descriptions-item label="学期">{{ current.semester }}</el-descriptions-item>
        <el-descriptions-item label="审核状态">{{ applyText(current.status) }}</el-descriptions-item>
        <el-descriptions-item label="评审结果">{{ current.result || '—' }}</el-descriptions-item>
        <el-descriptions-item v-if="current.attachments && current.attachments.length" label="材料附件" :span="2">
          <el-link v-for="(url, i) in current.attachments" :key="i" type="primary" :href="url" target="_blank" style="margin-right: 12px">
            附件 {{ i + 1 }}
          </el-link>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Check, Close } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listAwardApplies, auditAward, type AwardApplyResult } from '@/api/affairs';
import { ApplyStatus, AwardType } from '@shared-web/types';

const loading = ref(false);
const list = ref<AwardApplyResult[]>([]);
const detailVisible = ref(false);
const current = ref<AwardApplyResult | null>(null);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  studentName: '',
  type: undefined as AwardType | undefined,
  status: undefined as ApplyStatus | undefined,
});

const typeText = (t: AwardType): string => ({ SCHOLARSHIP: '奖学金', AID: '助学金', LOAN: '助学贷款', HONOR: '评优' } as any)[t];
const typeTagType = (t: AwardType): 'success' | 'warning' | 'info' | 'danger' => {
  if (t === 'SCHOLARSHIP') return 'success';
  if (t === 'AID') return 'warning';
  if (t === 'LOAN') return 'info';
  return 'danger';
};
const applyText = (s: ApplyStatus): string => ({ PENDING: '待审核', APPROVED: '已通过', REJECTED: '已驳回' } as any)[s];
const applyTagType = (s: ApplyStatus): 'warning' | 'success' | 'danger' => (s === 'PENDING' ? 'warning' : s === 'APPROVED' ? 'success' : 'danger');

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listAwardApplies({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      type: query.type,
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

async function onAudit(row: AwardApplyResult, passed: boolean): Promise<void> {
  try {
    const { value } = await ElMessageBox.prompt(
      `请输入评审结果（${passed ? '通过' : '驳回'}）`,
      `${passed ? '通过' : '驳回'}确认`,
      {
        inputType: 'textarea',
        inputValue: passed ? '审核通过' : '',
        inputPlaceholder: passed ? '评审意见（选填）' : '请输入驳回原因',
      },
    );
    await auditAward(row.id, { passed, result: value });
    ElMessage.success(passed ? '已通过' : '已驳回');
    await loadData();
  } catch { /* cancel */ }
}

function onViewDetail(row: AwardApplyResult): void {
  current.value = row;
  detailVisible.value = true;
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.audit-page {
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
