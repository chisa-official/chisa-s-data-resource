<template>
  <div class="score-audit-page">
    <PageHeader title="成绩审核" subtitle="成绩审核列表，支持通过 / 打回 / 批量审核" />

    <el-card>
      <div class="search-bar">
        <el-select v-model="query.courseId" placeholder="课程" clearable filterable style="width: 240px" @change="onSearch">
          <el-option v-for="c in courses" :key="c.id" :label="`${c.code} ${c.name}`" :value="c.id" />
        </el-select>
        <el-input v-model="query.semester" placeholder="学期（如 2025-2026-1）" clearable style="width: 180px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 120px" @keyup.enter="onSearch" />
        <el-select v-model="query.audited" placeholder="审核状态" clearable style="width: 140px" @change="onSearch">
          <el-option label="未审核" :value="false" />
          <el-option label="已审核" :value="true" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
        <div class="search-bar__right">
          <el-button
            type="success"
            :icon="Check"
            :disabled="selectedIds.length === 0"
            @click="onBatchAudit"
          >批量审核</el-button>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        border
        row-key="id"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="44" :selectable="(row: ScoreListResult) => !row.audited" />
        <el-table-column label="学号" width="120">
          <template #default="{ row }">{{ row.student?.studentNo || '—' }}</template>
        </el-table-column>
        <el-table-column label="姓名" width="100">
          <template #default="{ row }">{{ row.student?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="班级" min-width="120">
          <template #default="{ row }">{{ row.student?.class?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="课程" min-width="160">
          <template #default="{ row }">
            <div>{{ row.course?.name || '—' }}</div>
            <div class="sub-text">{{ row.course?.code }} · {{ typeLabel(row.course?.type) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="学期" prop="semester" width="130" />
        <el-table-column label="平时" width="70" align="center">
          <template #default="{ row }">{{ row.usualScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="考试" width="70" align="center">
          <template #default="{ row }">{{ row.examScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="总评" width="80" align="center">
          <template #default="{ row }">
            <span :class="{ 'fail-text': row.finalScore < 60 }">{{ row.finalScore }}</span>
          </template>
        </el-table-column>
        <el-table-column label="绩点" prop="gpaPoint" width="70" align="center" />
        <el-table-column label="重修" width="70" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.retake" type="danger" size="small">重修</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.audited ? 'success' : 'warning'" size="small">
              {{ row.audited ? '已审核' : '未审核' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <template v-if="!row.audited">
              <el-button type="success" link :icon="Check" @click="onAudit(row)">通过</el-button>
              <el-button type="warning" link :icon="RefreshLeft" @click="onReject(row)">打回</el-button>
            </template>
            <span v-else class="sub-text">已审核</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
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
import { Search, Refresh, Check, RefreshLeft } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listScores,
  auditScore,
  auditScoresBatch,
  rejectScore,
  type ScoreListResult,
} from '@/api/academic';
import { listCourses, type CourseListResult } from '@/api/base';

const loading = ref(false);
const list = ref<ScoreListResult[]>([]);
const courses = ref<CourseListResult[]>([]);
const selectedIds = ref<string[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  courseId: undefined as string | undefined,
  semester: '',
  studentNo: '',
  studentName: '',
  audited: undefined as boolean | undefined,
});

function typeLabel(type?: string): string {
  const map: Record<string, string> = { REQUIRED: '必修', ELECTIVE: '选修', PUBLIC: '公共' };
  return type ? map[type] || type : '';
}

async function loadCourses(): Promise<void> {
  try {
    const res = await listCourses({ page: 1, pageSize: 1000 });
    courses.value = res.list;
  } catch { /* ignore */ }
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listScores({
      page: pagination.page,
      pageSize: pagination.pageSize,
      courseId: query.courseId,
      semester: query.semester || undefined,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      audited: query.audited,
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
  query.courseId = undefined;
  query.semester = '';
  query.studentNo = '';
  query.studentName = '';
  query.audited = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

function onSelectionChange(rows: ScoreListResult[]): void {
  selectedIds.value = rows.map((r) => r.id);
}

async function onAudit(row: ScoreListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认审核通过「${row.student?.name}」的「${row.course?.name}」成绩（${row.finalScore}）？`,
      '成绩审核',
      { type: 'warning' },
    );
    await auditScore(row.id);
    ElMessage.success('审核通过');
    await loadData();
  } catch { /* cancel */ }
}

async function onReject(row: ScoreListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认打回「${row.student?.name}」的「${row.course?.name}」成绩，要求重新录入？`,
      '打回重录',
      { type: 'warning' },
    );
    await rejectScore(row.id);
    ElMessage.success('已打回');
    await loadData();
  } catch { /* cancel */ }
}

async function onBatchAudit(): Promise<void> {
  if (selectedIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(`确认批量审核选中的 ${selectedIds.value.length} 条成绩？`, '批量审核', { type: 'warning' });
    const res = await auditScoresBatch(selectedIds.value);
    ElMessage.success(`审核成功：${res.count} 条`);
    await loadData();
  } catch { /* cancel */ }
}

onMounted(() => {
  loadCourses();
  loadData();
});
</script>

<style scoped lang="scss">
.score-audit-page {
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
  &__right {
    margin-left: auto;
  }
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.sub-text {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.fail-text {
  color: var(--el-color-danger);
  font-weight: 600;
}
</style>
