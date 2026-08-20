<template>
  <div class="retake-page">
    <PageHeader title="重修 / 补考管理" subtitle="不及格成绩名单，批量报名重修、补考成绩录入" />

    <el-tabs v-model="activeTab" class="retake-tabs">
      <!-- 重修报名 -->
      <el-tab-pane label="重修报名" name="retake">
        <el-card>
          <div class="search-bar">
            <el-input v-model="retakeQuery.studentNo" placeholder="学号" clearable style="width: 140px" @keyup.enter="onSearchRetake" />
            <el-input v-model="retakeQuery.studentName" placeholder="姓名" clearable style="width: 120px" @keyup.enter="onSearchRetake" />
            <el-select v-model="retakeQuery.courseId" placeholder="课程" clearable filterable style="width: 220px" @change="onSearchRetake">
              <el-option v-for="c in courses" :key="c.id" :label="`${c.code} ${c.name}`" :value="c.id" />
            </el-select>
            <el-input v-model="retakeQuery.semester" placeholder="原学期" clearable style="width: 160px" @keyup.enter="onSearchRetake" />
            <el-button type="primary" :icon="Search" @click="onSearchRetake">查询</el-button>
            <el-button :icon="Refresh" @click="onResetRetake">重置</el-button>
            <div class="search-bar__right">
              <el-button
                type="primary"
                :icon="Plus"
                :disabled="retakeSelectedIds.length === 0"
                @click="onRegisterRetake"
              >批量报名重修</el-button>
            </div>
          </div>

          <el-table
            v-loading="retakeLoading"
            :data="retakeList"
            border
            row-key="id"
            @selection-change="onRetakeSelectionChange"
          >
            <el-table-column type="selection" width="44" />
            <el-table-column label="学号" width="120">
              <template #default="{ row }">{{ row.student?.studentNo || '—' }}</template>
            </el-table-column>
            <el-table-column label="姓名" width="100">
              <template #default="{ row }">{{ row.student?.name || '—' }}</template>
            </el-table-column>
            <el-table-column label="院系/班级" min-width="160">
              <template #default="{ row }">
                <div>{{ row.student?.department?.name || '—' }}</div>
                <div class="sub-text">{{ row.student?.class?.name || '—' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="课程" min-width="150">
              <template #default="{ row }">
                <div>{{ row.course?.name || '—' }}</div>
                <div class="sub-text">{{ row.course?.code }} · {{ row.course?.teacher?.name || '—' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="原学期" prop="semester" width="130" />
            <el-table-column label="总评" width="80" align="center">
              <template #default="{ row }">
                <span class="fail-text">{{ row.finalScore }}</span>
              </template>
            </el-table-column>
            <el-table-column label="重修状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="retakeStatusTagType(row.retakeStatus)" size="small">
                  {{ retakeStatusLabel(row.retakeStatus) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="retakePagination.page"
              v-model:page-size="retakePagination.pageSize"
              :total="retakePagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="loadRetakes"
              @size-change="onRetakeSizeChange"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 补考管理 -->
      <el-tab-pane label="补考管理" name="exam">
        <el-card>
          <div class="search-bar">
            <el-input v-model="examQuery.studentNo" placeholder="学号" clearable style="width: 140px" @keyup.enter="onSearchExam" />
            <el-input v-model="examQuery.studentName" placeholder="姓名" clearable style="width: 120px" @keyup.enter="onSearchExam" />
            <el-select v-model="examQuery.courseId" placeholder="课程" clearable filterable style="width: 220px" @change="onSearchExam">
              <el-option v-for="c in courses" :key="c.id" :label="`${c.code} ${c.name}`" :value="c.id" />
            </el-select>
            <el-input v-model="examQuery.semester" placeholder="学期" clearable style="width: 160px" @keyup.enter="onSearchExam" />
            <el-select v-model="examQuery.retake" placeholder="补考状态" clearable style="width: 140px" @change="onSearchExam">
              <el-option label="未补考" :value="false" />
              <el-option label="已补考" :value="true" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="onSearchExam">查询</el-button>
            <el-button :icon="Refresh" @click="onResetExam">重置</el-button>
            <div class="search-bar__right">
              <el-button
                type="warning"
                :icon="Check"
                :disabled="examSelectedIds.length === 0"
                @click="onBatchMark"
              >批量标记补考</el-button>
            </div>
          </div>

          <el-table
            v-loading="examLoading"
            :data="examList"
            border
            row-key="id"
            @selection-change="onExamSelectionChange"
          >
            <el-table-column type="selection" width="44" :selectable="(row: RetakeListResult) => !row.retake" />
            <el-table-column label="学号" width="120">
              <template #default="{ row }">{{ row.student?.studentNo || '—' }}</template>
            </el-table-column>
            <el-table-column label="姓名" width="100">
              <template #default="{ row }">{{ row.student?.name || '—' }}</template>
            </el-table-column>
            <el-table-column label="院系/班级" min-width="160">
              <template #default="{ row }">
                <div>{{ row.student?.department?.name || '—' }}</div>
                <div class="sub-text">{{ row.student?.class?.name || '—' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="课程" min-width="150">
              <template #default="{ row }">
                <div>{{ row.course?.name || '—' }}</div>
                <div class="sub-text">{{ row.course?.code }}</div>
              </template>
            </el-table-column>
            <el-table-column label="学期" prop="semester" width="130" />
            <el-table-column label="原总评" width="80" align="center">
              <template #default="{ row }">
                <span class="fail-text">{{ row.finalScore }}</span>
              </template>
            </el-table-column>
            <el-table-column label="补考" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.retake" type="success" size="small">已补考</el-tag>
                <span v-else class="sub-text">—</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link :icon="Edit" @click="onRecordScore(row)">录入补考</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="examPagination.page"
              v-model:page-size="examPagination.pageSize"
              :total="examPagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="loadExams"
              @size-change="onExamSizeChange"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 录入补考成绩弹窗 -->
    <el-dialog v-model="scoreDialogVisible" title="录入补考成绩" width="460px" :close-on-click-modal="false">
      <el-form ref="scoreFormRef" :model="scoreForm" :rules="scoreRules" label-width="100px">
        <el-form-item label="学生">
          <span>{{ scoreForm.studentName }}（{{ scoreForm.studentNo }}）</span>
        </el-form-item>
        <el-form-item label="课程">
          <span>{{ scoreForm.courseName }}</span>
        </el-form-item>
        <el-form-item label="原总评">
          <span class="fail-text">{{ scoreForm.originalScore }}</span>
        </el-form-item>
        <el-form-item label="补考成绩" prop="retakeScore">
          <el-input-number v-model="scoreForm.retakeScore" :min="0" :max="100" controls-position="right" style="width: 200px" />
        </el-form-item>
        <el-form-item>
          <span class="form-tip">补考及格（≥60）绩点统一记为 1.0；不及格绩点为 0</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="scoreDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="scoreSubmitting" @click="onSubmitScore">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Search, Refresh, Plus, Edit, Check } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listRetakes,
  registerRetake,
  listExamRetakes,
  recordExamRetakeScore,
  batchMarkRetake,
  type RetakeListResult,
} from '@/api/academic';
import { listCourses, type CourseListResult } from '@/api/base';

const activeTab = ref<'retake' | 'exam'>('retake');
const courses = ref<CourseListResult[]>([]);

// 重修报名
const retakeLoading = ref(false);
const retakeList = ref<RetakeListResult[]>([]);
const retakeSelectedIds = ref<string[]>([]);
const retakePagination = reactive({ page: 1, pageSize: 10, total: 0 });
const retakeQuery = reactive({
  studentNo: '',
  studentName: '',
  courseId: undefined as string | undefined,
  semester: '',
});

// 补考管理
const examLoading = ref(false);
const examList = ref<RetakeListResult[]>([]);
const examSelectedIds = ref<string[]>([]);
const examPagination = reactive({ page: 1, pageSize: 10, total: 0 });
const examQuery = reactive({
  studentNo: '',
  studentName: '',
  courseId: undefined as string | undefined,
  semester: '',
  retake: undefined as boolean | undefined,
});

// 补考成绩录入
const scoreDialogVisible = ref(false);
const scoreSubmitting = ref(false);
const scoreFormRef = ref<FormInstance>();
const scoreForm = reactive({
  id: '',
  studentNo: '',
  studentName: '',
  courseName: '',
  originalScore: 0,
  retakeScore: 60,
});
const scoreRules: FormRules = {
  retakeScore: [{ required: true, message: '请输入补考成绩', trigger: 'blur' }],
};

function retakeStatusLabel(s: string): string {
  const map: Record<string, string> = {
    SELECTED: '已报名',
    DROPPED: '已退选',
    COMPLETED: '已完成',
    NOT_APPLIED: '未报名',
  };
  return map[s] || s;
}

function retakeStatusTagType(s: string): 'success' | 'info' | 'warning' {
  if (s === 'SELECTED') return 'success';
  if (s === 'COMPLETED') return 'info';
  return 'warning';
}

async function loadCourses(): Promise<void> {
  try {
    const res = await listCourses({ page: 1, pageSize: 1000 });
    courses.value = res.list;
  } catch { /* ignore */ }
}

async function loadRetakes(): Promise<void> {
  retakeLoading.value = true;
  try {
    const res = await listRetakes({
      page: retakePagination.page,
      pageSize: retakePagination.pageSize,
      studentNo: retakeQuery.studentNo || undefined,
      studentName: retakeQuery.studentName || undefined,
      courseId: retakeQuery.courseId,
      semester: retakeQuery.semester || undefined,
    });
    retakeList.value = res.list;
    retakePagination.total = res.total;
  } catch { /* ignore */ } finally {
    retakeLoading.value = false;
  }
}

function onSearchRetake(): void {
  retakePagination.page = 1;
  loadRetakes();
}

function onResetRetake(): void {
  retakeQuery.studentNo = '';
  retakeQuery.studentName = '';
  retakeQuery.courseId = undefined;
  retakeQuery.semester = '';
  retakePagination.page = 1;
  loadRetakes();
}

function onRetakeSizeChange(size: number): void {
  retakePagination.pageSize = size;
  retakePagination.page = 1;
  loadRetakes();
}

function onRetakeSelectionChange(rows: RetakeListResult[]): void {
  retakeSelectedIds.value = rows.map((r) => r.id);
}

async function onRegisterRetake(): Promise<void> {
  if (retakeSelectedIds.value.length === 0) return;
  try {
    const { value } = await ElMessageBox.prompt(
      `为选中的 ${retakeSelectedIds.value.length} 条不及格记录报名重修，请输入重修学期（如 2025-2026-2，留空使用当前学期）`,
      '批量报名重修',
      {
        inputType: 'text',
        inputValue: '',
        inputPlaceholder: '如 2025-2026-2',
      },
    );
    await registerRetake(retakeSelectedIds.value, value || undefined);
    ElMessage.success('批量报名成功');
    await loadRetakes();
  } catch { /* cancel */ }
}

async function loadExams(): Promise<void> {
  examLoading.value = true;
  try {
    const res = await listExamRetakes({
      page: examPagination.page,
      pageSize: examPagination.pageSize,
      studentNo: examQuery.studentNo || undefined,
      studentName: examQuery.studentName || undefined,
      courseId: examQuery.courseId,
      semester: examQuery.semester || undefined,
      retake: examQuery.retake,
    });
    examList.value = res.list;
    examPagination.total = res.total;
  } catch { /* ignore */ } finally {
    examLoading.value = false;
  }
}

function onSearchExam(): void {
  examPagination.page = 1;
  loadExams();
}

function onResetExam(): void {
  examQuery.studentNo = '';
  examQuery.studentName = '';
  examQuery.courseId = undefined;
  examQuery.semester = '';
  examQuery.retake = undefined;
  examPagination.page = 1;
  loadExams();
}

function onExamSizeChange(size: number): void {
  examPagination.pageSize = size;
  examPagination.page = 1;
  loadExams();
}

function onExamSelectionChange(rows: RetakeListResult[]): void {
  examSelectedIds.value = rows.map((r) => r.id);
}

async function onBatchMark(): Promise<void> {
  if (examSelectedIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(`确认将选中的 ${examSelectedIds.value.length} 条记录批量标记为补考？`, '批量标记补考', { type: 'warning' });
    const res = await batchMarkRetake(examSelectedIds.value);
    ElMessage.success(`标记成功：${res.count} 条`);
    await loadExams();
  } catch { /* cancel */ }
}

function onRecordScore(row: RetakeListResult): void {
  scoreForm.id = row.id;
  scoreForm.studentNo = row.student?.studentNo || '';
  scoreForm.studentName = row.student?.name || '';
  scoreForm.courseName = row.course?.name || '';
  scoreForm.originalScore = row.finalScore;
  scoreForm.retakeScore = 60;
  scoreDialogVisible.value = true;
}

async function onSubmitScore(): Promise<void> {
  if (!scoreFormRef.value) return;
  const valid = await scoreFormRef.value.validate().catch(() => false);
  if (!valid) return;
  scoreSubmitting.value = true;
  try {
    await recordExamRetakeScore(scoreForm.id, scoreForm.retakeScore);
    ElMessage.success('补考成绩已录入');
    scoreDialogVisible.value = false;
    await loadExams();
  } catch { /* ignore */ } finally {
    scoreSubmitting.value = false;
  }
}

onMounted(() => {
  loadCourses();
  loadRetakes();
  loadExams();
});
</script>

<style scoped lang="scss">
.retake-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.retake-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }
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
.form-tip {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
