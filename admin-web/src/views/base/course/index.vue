<template>
  <div class="course-page">
    <PageHeader title="课程维护" subtitle="维护课程基础信息" />

    <el-card>
      <div class="search-bar">
        <el-input
          v-model="query.name"
          placeholder="课程名称"
          clearable
          style="width: 180px"
          @keyup.enter="onSearch"
        />
        <el-select
          v-model="query.departmentId"
          placeholder="开课院系"
          clearable
          filterable
          style="width: 200px"
          @change="onSearch"
        >
          <el-option
            v-for="d in departments"
            :key="d.id"
            :label="d.name"
            :value="d.id"
          />
        </el-select>
        <el-select
          v-model="query.type"
          placeholder="课程类型"
          clearable
          style="width: 160px"
          @change="onSearch"
        >
          <el-option label="必修" value="REQUIRED" />
          <el-option label="选修" value="ELECTIVE" />
          <el-option label="公共" value="PUBLIC" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
        <div class="search-bar__right">
          <el-button type="primary" :icon="Plus" @click="onAdd">新增课程</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" border style="width: 100%">
        <el-table-column label="课程编码" prop="code" width="140" />
        <el-table-column label="课程名称" prop="name" min-width="180" />
        <el-table-column label="学分" prop="credit" width="80" align="center" />
        <el-table-column label="学时" prop="hours" width="80" align="center" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTag(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="授课教师" min-width="120">
          <template #default="{ row }">{{ row.teacher?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="开课院系" min-width="140">
          <template #default="{ row }">{{ row.department?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="容量" prop="capacity" width="90" align="center" />
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="课程编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入课程编码" maxlength="30" />
        </el-form-item>
        <el-form-item label="课程名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入课程名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="开课院系" prop="departmentId">
          <el-select
            v-model="form.departmentId"
            placeholder="请选择院系"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="d in departments"
              :key="d.id"
              :label="d.name"
              :value="d.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="授课教师" prop="teacherId">
          <el-select
            v-model="form.teacherId"
            placeholder="请选择教师"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="t in teachers"
              :key="t.id"
              :label="`${t.name}（${t.teacherNo}）`"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="课程类型" prop="type">
          <el-select v-model="form.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="必修" value="REQUIRED" />
            <el-option label="选修" value="ELECTIVE" />
            <el-option label="公共" value="PUBLIC" />
          </el-select>
        </el-form-item>
        <el-form-item label="学分" prop="credit">
          <el-input-number v-model="form.credit" :min="0.5" :max="10" :step="0.5" />
        </el-form-item>
        <el-form-item label="学时" prop="hours">
          <el-input-number v-model="form.hours" :min="1" :max="200" />
        </el-form-item>
        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="form.capacity" :min="1" :max="9999" />
        </el-form-item>
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
import { Plus, Edit, Delete, Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  listTeachers,
  getDepartmentList,
  type CourseListResult,
  type TeacherListResult,
} from '@/api/base';
import { CourseType } from '@shared-web/types';
import type { Department } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<CourseListResult[]>([]);
const departments = ref<Department[]>([]);
const teachers = ref<TeacherListResult[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<string | null>(null);

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const query = reactive({
  name: '',
  departmentId: undefined as string | undefined,
  type: undefined as string | undefined,
});

const form = reactive({
  code: '',
  name: '',
  credit: 2,
  hours: 32,
  teacherId: undefined as string | undefined,
  departmentId: undefined as string | undefined,
  type: 'REQUIRED' as CourseType,
  capacity: 60,
});

const rules: FormRules = {
  code: [{ required: true, message: '请输入课程编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  departmentId: [{ required: true, message: '请选择开课院系', trigger: 'change' }],
  teacherId: [{ required: true, message: '请选择授课教师', trigger: 'change' }],
  type: [{ required: true, message: '请选择课程类型', trigger: 'change' }],
  credit: [{ required: true, message: '请输入学分', trigger: 'blur' }],
  hours: [{ required: true, message: '请输入学时', trigger: 'blur' }],
  capacity: [{ required: true, message: '请输入容量', trigger: 'blur' }],
};

const dialogTitle = computed(() => (editingId.value ? '编辑课程' : '新增课程'));

function typeLabel(type: CourseType): string {
  const map: Record<string, string> = {
    REQUIRED: '必修',
    ELECTIVE: '选修',
    PUBLIC: '公共',
  };
  return map[type] || type;
}

function typeTag(type: CourseType): 'primary' | 'success' | 'warning' {
  const map: Record<string, 'primary' | 'success' | 'warning'> = {
    REQUIRED: 'primary',
    ELECTIVE: 'success',
    PUBLIC: 'warning',
  };
  return map[type] || 'info' as any;
}

async function loadDepartments(): Promise<void> {
  try {
    departments.value = await getDepartmentList();
  } catch {
    // ignore
  }
}

async function loadTeachers(): Promise<void> {
  try {
    const res = await listTeachers({ page: 1, pageSize: 100 });
    teachers.value = res.list;
  } catch {
    // ignore
  }
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listCourses({
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: query.name || undefined,
      departmentId: query.departmentId,
      type: query.type,
    });
    list.value = res.list;
    pagination.total = res.total;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  pagination.page = 1;
  loadData();
}

function onReset(): void {
  query.name = '';
  query.departmentId = undefined;
  query.type = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

function resetForm(): void {
  form.code = '';
  form.name = '';
  form.credit = 2;
  form.hours = 32;
  form.teacherId = undefined;
  form.departmentId = undefined;
  form.type = CourseType.REQUIRED;
  form.capacity = 60;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function onAdd(): void {
  resetForm();
  dialogVisible.value = true;
}

function onEdit(row: CourseListResult): void {
  resetForm();
  editingId.value = row.id;
  form.code = row.code;
  form.name = row.name;
  form.credit = row.credit;
  form.hours = row.hours;
  form.teacherId = row.teacherId;
  form.departmentId = row.departmentId;
  form.type = row.type;
  form.capacity = row.capacity;
  dialogVisible.value = true;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const params = {
      code: form.code,
      name: form.name,
      credit: form.credit,
      hours: form.hours,
      teacherId: form.teacherId!,
      departmentId: form.departmentId!,
      type: form.type,
      capacity: form.capacity,
    };
    if (editingId.value) {
      await updateCourse(editingId.value, params);
      ElMessage.success('更新成功');
    } else {
      await createCourse(params);
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    await loadData();
  } catch {
    // ignore
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: CourseListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除课程「${row.name}」？`, '删除确认', { type: 'warning' });
    await deleteCourse(row.id);
    ElMessage.success('删除成功');
    await loadData();
  } catch {
    // 取消或失败
  }
}

onMounted(() => {
  loadDepartments();
  loadTeachers();
  loadData();
});
</script>

<style scoped lang="scss">
.course-page {
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
</style>
