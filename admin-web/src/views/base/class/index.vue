<template>
  <div class="class-page">
    <PageHeader title="班级管理" subtitle="维护各院系、专业下的班级信息" />

    <el-card>
      <div class="search-bar">
        <el-input
          v-model="query.name"
          placeholder="班级名称"
          clearable
          style="width: 180px"
          @keyup.enter="onSearch"
        />
        <el-select
          v-model="query.departmentId"
          placeholder="所属院系"
          clearable
          filterable
          style="width: 200px"
          @change="onDepartmentChange('query')"
        >
          <el-option
            v-for="d in departments"
            :key="d.id"
            :label="d.name"
            :value="d.id"
          />
        </el-select>
        <el-select
          v-model="query.majorId"
          placeholder="所属专业"
          clearable
          filterable
          :disabled="!query.departmentId"
          style="width: 200px"
          @change="onSearch"
        >
          <el-option
            v-for="m in queryMajors"
            :key="m.id"
            :label="m.name"
            :value="m.id"
          />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
        <div class="search-bar__right">
          <el-button type="primary" :icon="Plus" @click="onAdd">新增班级</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" border style="width: 100%">
        <el-table-column label="班级名称" prop="name" min-width="160" />
        <el-table-column label="所属院系" min-width="160">
          <template #default="{ row }">{{ row.department?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="所属专业" min-width="160">
          <template #default="{ row }">{{ row.major?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="年级" prop="grade" width="100" align="center" />
        <el-table-column label="学生人数" prop="studentCount" width="110" align="center">
          <template #default="{ row }">{{ row.studentCount ?? 0 }}</template>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="所属院系" prop="departmentId">
          <el-select
            v-model="form.departmentId"
            placeholder="请选择院系"
            filterable
            style="width: 100%"
            @change="onDepartmentChange('form')"
          >
            <el-option
              v-for="d in departments"
              :key="d.id"
              :label="d.name"
              :value="d.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="所属专业" prop="majorId">
          <el-select
            v-model="form.majorId"
            placeholder="请选择专业"
            filterable
            :disabled="!form.departmentId"
            style="width: 100%"
          >
            <el-option
              v-for="m in formMajors"
              :key="m.id"
              :label="m.name"
              :value="m.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="班级名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入班级名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="年级" prop="grade">
          <el-input-number v-model="form.grade" :min="2000" :max="2099" />
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
  listClasses,
  createClass,
  updateClass,
  deleteClass,
  listMajors,
  getDepartmentList,
  type ClassListResult,
  type MajorListResult,
} from '@/api/base';
import type { Department } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<ClassListResult[]>([]);
const departments = ref<Department[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<string | null>(null);

// 专业缓存：以 departmentId 为键
const majorsCache = ref<Record<string, MajorListResult[]>>({});
// 表单中当前选择院系对应的专业列表
const queryMajors = ref<MajorListResult[]>([]);
const formMajors = ref<MajorListResult[]>([]);

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const query = reactive({
  name: '',
  departmentId: undefined as string | undefined,
  majorId: undefined as string | undefined,
});

const form = reactive({
  name: '',
  departmentId: undefined as string | undefined,
  majorId: undefined as string | undefined,
  grade: new Date().getFullYear(),
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入班级名称', trigger: 'blur' }],
  departmentId: [{ required: true, message: '请选择所属院系', trigger: 'change' }],
  majorId: [{ required: true, message: '请选择所属专业', trigger: 'change' }],
  grade: [{ required: true, message: '请输入年级', trigger: 'blur' }],
};

const dialogTitle = computed(() => (editingId.value ? '编辑班级' : '新增班级'));

async function loadDepartments(): Promise<void> {
  try {
    departments.value = await getDepartmentList();
  } catch {
    // ignore
  }
}

async function loadMajorsByDepartment(departmentId: string): Promise<MajorListResult[]> {
  if (majorsCache.value[departmentId]) {
    return majorsCache.value[departmentId];
  }
  try {
    const res = await listMajors({ departmentId, page: 1, pageSize: 100 });
    majorsCache.value[departmentId] = res.list;
    return res.list;
  } catch {
    return [];
  }
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listClasses({
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: query.name || undefined,
      departmentId: query.departmentId,
      majorId: query.majorId,
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
  query.majorId = undefined;
  queryMajors.value = [];
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

async function onDepartmentChange(target: 'query' | 'form'): Promise<void> {
  if (target === 'query') {
    query.majorId = undefined;
    if (query.departmentId) {
      queryMajors.value = await loadMajorsByDepartment(query.departmentId);
    } else {
      queryMajors.value = [];
    }
    onSearch();
  } else {
    form.majorId = undefined;
    if (form.departmentId) {
      formMajors.value = await loadMajorsByDepartment(form.departmentId);
    } else {
      formMajors.value = [];
    }
  }
}

function resetForm(): void {
  form.name = '';
  form.departmentId = undefined;
  form.majorId = undefined;
  form.grade = new Date().getFullYear();
  formMajors.value = [];
  editingId.value = null;
  formRef.value?.clearValidate();
}

function onAdd(): void {
  resetForm();
  dialogVisible.value = true;
}

async function onEdit(row: ClassListResult): Promise<void> {
  resetForm();
  editingId.value = row.id;
  form.name = row.name;
  form.departmentId = row.departmentId;
  form.majorId = row.majorId;
  form.grade = row.grade;
  if (row.departmentId) {
    formMajors.value = await loadMajorsByDepartment(row.departmentId);
  }
  dialogVisible.value = true;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const params = {
      name: form.name,
      departmentId: form.departmentId!,
      majorId: form.majorId!,
      grade: form.grade,
    };
    if (editingId.value) {
      await updateClass(editingId.value, params);
      ElMessage.success('更新成功');
    } else {
      await createClass(params);
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

async function onDelete(row: ClassListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除班级「${row.name}」？`, '删除确认', { type: 'warning' });
    await deleteClass(row.id);
    ElMessage.success('删除成功');
    await loadData();
  } catch {
    // 取消或失败
  }
}

onMounted(() => {
  loadDepartments();
  loadData();
});
</script>

<style scoped lang="scss">
.class-page {
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
