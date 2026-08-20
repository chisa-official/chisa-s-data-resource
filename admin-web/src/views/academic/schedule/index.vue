<template>
  <div class="schedule-page">
    <PageHeader title="排课管理" subtitle="排课表单（课程 + 班级 + 教室 + 时间段），自动冲突检测；课表发布" />

    <el-card>
      <div class="search-bar">
        <el-select
          v-model="query.courseId"
          placeholder="课程"
          clearable
          filterable
          style="width: 220px"
          @change="onSearch"
        >
          <el-option v-for="c in courses" :key="c.id" :label="`${c.code} ${c.name}`" :value="c.id" />
        </el-select>
        <el-select
          v-model="query.classId"
          placeholder="班级"
          clearable
          filterable
          style="width: 180px"
          @change="onSearch"
        >
          <el-option v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-input v-model="query.classroom" placeholder="教室" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-select v-model="query.weekDay" placeholder="星期" clearable style="width: 120px" @change="onSearch">
          <el-option v-for="d in weekDays" :key="d.value" :label="d.label" :value="d.value" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
        <div class="search-bar__right">
          <el-button :icon="Promotion" :disabled="selectedIds.length === 0" @click="onPublish">发布课表</el-button>
          <el-button type="primary" :icon="Plus" @click="onAdd">新增排课</el-button>
        </div>
      </div>

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="list"
        border
        row-key="id"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="44" />
        <el-table-column label="课程" min-width="180">
          <template #default="{ row }">
            <div>{{ row.course?.name || '—' }}</div>
            <div class="sub-text">{{ row.course?.code }} · {{ row.course?.teacher?.name || '—' }}</div>
          </template>
        </el-table-column>
        <el-table-column label="班级" min-width="140">
          <template #default="{ row }">{{ row.className || '—' }}</template>
        </el-table-column>
        <el-table-column label="教室" prop="classroom" width="120" />
        <el-table-column label="星期" width="80" align="center">
          <template #default="{ row }">{{ weekDayText(row.weekDay) }}</template>
        </el-table-column>
        <el-table-column label="节次" width="110" align="center">
          <template #default="{ row }">第 {{ row.startSection }}-{{ row.endSection }} 节</template>
        </el-table-column>
        <el-table-column label="周次" width="110" align="center">
          <template #default="{ row }">第 {{ row.startWeek }}-{{ row.endWeek }} 周</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="onEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="onDelete(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="课程" prop="courseId">
          <el-select v-model="form.courseId" placeholder="请选择课程" filterable style="width: 100%">
            <el-option v-for="c in courses" :key="c.id" :label="`${c.code} ${c.name}（${c.teacher?.name || '无教师'}）`" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="班级" prop="classId">
          <el-select v-model="form.classId" placeholder="请选择班级" filterable style="width: 100%">
            <el-option v-for="c in classes" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="教室" prop="classroom">
          <el-input v-model="form.classroom" placeholder="如：教学楼A-301" maxlength="30" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="星期" prop="weekDay">
              <el-select v-model="form.weekDay" style="width: 100%">
                <el-option v-for="d in weekDays" :key="d.value" :label="d.label" :value="d.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="节次" prop="sectionRange">
              <el-input-number v-model="form.startSection" :min="1" :max="13" controls-position="right" style="width: 90px" />
              <span style="margin: 0 6px">~</span>
              <el-input-number v-model="form.endSection" :min="1" :max="13" controls-position="right" style="width: 90px" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="起始周" prop="startWeek">
              <el-input-number v-model="form.startWeek" :min="1" :max="30" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束周" prop="endWeek">
              <el-input-number v-model="form.endWeek" :min="1" :max="30" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { Plus, Edit, Delete, Search, Refresh, Promotion } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  publishSchedules,
  type ScheduleListResult,
} from '@/api/academic';
import { listCourses, listClasses, type CourseListResult, type ClassListResult } from '@/api/base';

const loading = ref(false);
const submitting = ref(false);
const list = ref<ScheduleListResult[]>([]);
const courses = ref<CourseListResult[]>([]);
const classes = ref<ClassListResult[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<string | null>(null);
const selectedIds = ref<string[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  courseId: undefined as string | undefined,
  classId: undefined as string | undefined,
  classroom: '',
  weekDay: undefined as number | undefined,
});

const form = reactive({
  courseId: undefined as string | undefined,
  classId: undefined as string | undefined,
  classroom: '',
  weekDay: 1,
  startSection: 1,
  endSection: 2,
  startWeek: 1,
  endWeek: 16,
});

const rules: FormRules = {
  courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
  classroom: [{ required: true, message: '请输入教室', trigger: 'blur' }],
  weekDay: [{ required: true, message: '请选择星期', trigger: 'change' }],
  startSection: [{ required: true, message: '请输入起始节次', trigger: 'blur' }],
  endSection: [{ required: true, message: '请输入结束节次', trigger: 'blur' }],
  startWeek: [{ required: true, message: '请输入起始周次', trigger: 'blur' }],
  endWeek: [{ required: true, message: '请输入结束周次', trigger: 'blur' }],
};

const dialogTitle = computed(() => (editingId.value ? '编辑排课' : '新增排课'));

const weekDays = [
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
  { label: '周日', value: 7 },
];

function weekDayText(d: number): string {
  return weekDays.find((w) => w.value === d)?.label || String(d);
}

async function loadCourses(): Promise<void> {
  try {
    const res = await listCourses({ page: 1, pageSize: 1000 });
    courses.value = res.list;
  } catch { /* ignore */ }
}

async function loadClasses(): Promise<void> {
  try {
    const res = await listClasses({ page: 1, pageSize: 1000 });
    classes.value = res.list;
  } catch { /* ignore */ }
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listSchedules({
      page: pagination.page,
      pageSize: pagination.pageSize,
      courseId: query.courseId,
      classId: query.classId,
      classroom: query.classroom || undefined,
      weekDay: query.weekDay,
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
  query.classId = undefined;
  query.classroom = '';
  query.weekDay = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

function onSelectionChange(rows: ScheduleListResult[]): void {
  selectedIds.value = rows.map((r) => r.id);
}

function resetForm(): void {
  form.courseId = undefined;
  form.classId = undefined;
  form.classroom = '';
  form.weekDay = 1;
  form.startSection = 1;
  form.endSection = 2;
  form.startWeek = 1;
  form.endWeek = 16;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function onAdd(): void {
  resetForm();
  dialogVisible.value = true;
}

function onEdit(row: ScheduleListResult): void {
  resetForm();
  editingId.value = row.id;
  form.courseId = row.courseId;
  form.classId = row.classId;
  form.classroom = row.classroom;
  form.weekDay = row.weekDay;
  form.startSection = row.startSection;
  form.endSection = row.endSection;
  form.startWeek = row.startWeek;
  form.endWeek = row.endWeek;
  dialogVisible.value = true;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  if (form.startSection > form.endSection) {
    ElMessage.warning('起始节次不能大于结束节次');
    return;
  }
  if (form.startWeek > form.endWeek) {
    ElMessage.warning('起始周次不能大于结束周次');
    return;
  }
  submitting.value = true;
  try {
    const params = {
      courseId: form.courseId!,
      classId: form.classId!,
      classroom: form.classroom,
      weekDay: form.weekDay,
      startSection: form.startSection,
      endSection: form.endSection,
      startWeek: form.startWeek,
      endWeek: form.endWeek,
    };
    if (editingId.value) {
      await updateSchedule(editingId.value, params);
      ElMessage.success('更新成功');
    } else {
      await createSchedule(params);
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

async function onDelete(row: ScheduleListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除该排课记录（${row.course?.name || ''}）？`, '删除确认', { type: 'warning' });
    await deleteSchedule(row.id);
    ElMessage.success('删除成功');
    await loadData();
  } catch { /* cancel */ }
}

async function onPublish(): Promise<void> {
  if (selectedIds.value.length === 0) return;
  try {
    await ElMessageBox.confirm(`确认发布选中的 ${selectedIds.value.length} 条排课记录？`, '课表发布', { type: 'warning' });
    const res = await publishSchedules(selectedIds.value);
    ElMessage.success(`发布成功：${res.count} 条`);
    await loadData();
  } catch { /* cancel */ }
}

onMounted(() => {
  loadCourses();
  loadClasses();
  loadData();
});
</script>

<style scoped lang="scss">
.schedule-page {
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
</style>
