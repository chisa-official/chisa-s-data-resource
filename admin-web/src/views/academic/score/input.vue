<template>
  <div class="score-input-page">
    <PageHeader title="成绩录入" subtitle="按教学班录入成绩，支持 Excel 批量导入，平时/考试/总评" />

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
          <el-button :icon="Download" @click="onDownloadTemplate">下载模板</el-button>
          <el-upload :show-file-list="false" :before-upload="onImport" accept=".xlsx,.xls">
            <el-button :icon="Upload">批量导入</el-button>
          </el-upload>
          <el-button type="success" :icon="Histogram" @click="onCalcGpa">绩点计算</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" border>
        <el-table-column label="学号" width="120">
          <template #default="{ row }">{{ row.student?.studentNo || '—' }}</template>
        </el-table-column>
        <el-table-column label="姓名" width="100">
          <template #default="{ row }">{{ row.student?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="班级" min-width="130">
          <template #default="{ row }">{{ row.student?.class?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="课程" min-width="160">
          <template #default="{ row }">
            <div>{{ row.course?.name || '—' }}</div>
            <div class="sub-text">{{ row.course?.code }}</div>
          </template>
        </el-table-column>
        <el-table-column label="学期" prop="semester" width="130" />
        <el-table-column label="平时" width="80" align="center">
          <template #default="{ row }">{{ row.usualScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="考试" width="80" align="center">
          <template #default="{ row }">{{ row.examScore ?? '—' }}</template>
        </el-table-column>
        <el-table-column label="总评" width="80" align="center">
          <template #default="{ row }">
            <span :class="{ 'fail-text': row.finalScore < 60 }">{{ row.finalScore }}</span>
          </template>
        </el-table-column>
        <el-table-column label="绩点" prop="gpaPoint" width="70" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.audited ? 'success' : 'warning'" size="small">
              {{ row.audited ? '已审核' : '未审核' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" :disabled="row.audited" @click="onEdit(row)">录入</el-button>
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

    <el-dialog v-model="dialogVisible" title="成绩录入" width="520px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="学生">
          <span>{{ form.studentName }}（{{ form.studentNo }}）</span>
        </el-form-item>
        <el-form-item label="课程">
          <span>{{ form.courseName }}</span>
        </el-form-item>
        <el-form-item label="学期">
          <span>{{ form.semester }}</span>
        </el-form-item>
        <el-form-item label="平时成绩" prop="usualScore">
          <el-input-number v-model="form.usualScore" :min="0" :max="100" :precision="1" controls-position="right" style="width: 200px" />
          <span class="form-tip">占比 30%</span>
        </el-form-item>
        <el-form-item label="考试成绩" prop="examScore">
          <el-input-number v-model="form.examScore" :min="0" :max="100" :precision="1" controls-position="right" style="width: 200px" />
          <span class="form-tip">占比 70%</span>
        </el-form-item>
        <el-form-item label="总评成绩">
          <el-tag :type="form.finalScore < 60 ? 'danger' : 'success'" size="large">{{ form.finalScore }}</el-tag>
          <span class="form-tip">自动按 平时×0.3 + 考试×0.7 计算</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Search, Refresh, Edit, Upload, Download, Histogram } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listScores,
  updateScore,
  calculateGpa,
  downloadScoreTemplate,
  importScores,
  type ScoreListResult,
} from '@/api/academic';
import { listCourses, type CourseListResult } from '@/api/base';

const loading = ref(false);
const submitting = ref(false);
const list = ref<ScoreListResult[]>([]);
const courses = ref<CourseListResult[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<string | null>(null);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  courseId: undefined as string | undefined,
  semester: '',
  studentNo: '',
  studentName: '',
  audited: undefined as boolean | undefined,
});

const form = reactive({
  studentNo: '',
  studentName: '',
  courseName: '',
  semester: '',
  usualScore: 0,
  examScore: 0,
  finalScore: 0,
});

const rules: FormRules = {
  usualScore: [{ required: true, message: '请输入平时成绩', trigger: 'blur' }],
  examScore: [{ required: true, message: '请输入考试成绩', trigger: 'blur' }],
};

const finalScoreComputed = computed(() => {
  return Number((form.usualScore * 0.3 + form.examScore * 0.7).toFixed(2));
});

// 同步 finalScore
function syncFinalScore(): void {
  form.finalScore = finalScoreComputed.value;
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

function onEdit(row: ScoreListResult): void {
  editingId.value = row.id;
  form.studentNo = row.student?.studentNo || '';
  form.studentName = row.student?.name || '';
  form.courseName = row.course?.name || '';
  form.semester = row.semester;
  form.usualScore = row.usualScore ?? 0;
  form.examScore = row.examScore ?? 0;
  syncFinalScore();
  dialogVisible.value = true;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  syncFinalScore();
  submitting.value = true;
  try {
    await updateScore(editingId.value!, {
      usualScore: form.usualScore,
      examScore: form.examScore,
      finalScore: form.finalScore,
    });
    ElMessage.success('成绩已保存');
    dialogVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

async function onDownloadTemplate(): Promise<void> {
  try {
    await downloadScoreTemplate(query.courseId, query.semester || undefined);
    ElMessage.success('模板下载成功');
  } catch { /* ignore */ }
}

async function onImport(file: File): Promise<boolean> {
  try {
    loading.value = true;
    const result = await importScores(file, query.courseId, query.semester || undefined);
    ElMessage.success(`导入完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`);
    if (result.errors.length > 0) {
      const errorText = result.errors.slice(0, 10).map((e) => `第 ${e.row} 行：${e.message}`).join('\n');
      ElMessageBox.alert(errorText, `失败 ${result.failCount} 条详情（前 10 条）`, { type: 'warning' });
    }
    await loadData();
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
  return false;
}

async function onCalcGpa(): Promise<void> {
  try {
    const res = await calculateGpa();
    ElMessage.success(`绩点计算完成，覆盖学生数：${(res as any).studentCount || '—'}`);
  } catch { /* ignore */ }
}

watch(() => [form.usualScore, form.examScore], syncFinalScore);

onMounted(() => {
  loadCourses();
  loadData();
});
</script>

<style scoped lang="scss">
.score-input-page {
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
    display: flex;
    gap: 8px;
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
.form-tip {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
