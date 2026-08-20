<template>
  <div class="teacher-page">
    <PageHeader title="教师管理" subtitle="维护教师基础信息" />

    <el-card>
      <div class="search-bar">
        <el-input
          v-model="query.name"
          placeholder="教师姓名"
          clearable
          style="width: 180px"
          @keyup.enter="onSearch"
        />
        <el-select
          v-model="query.departmentId"
          placeholder="所属院系"
          clearable
          filterable
          style="width: 220px"
          @change="onSearch"
        >
          <el-option
            v-for="d in departments"
            :key="d.id"
            :label="d.name"
            :value="d.id"
          />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
        <div class="search-bar__right">
          <el-button type="primary" :icon="Plus" @click="onAdd">新增教师</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" border style="width: 100%">
        <el-table-column label="工号" prop="teacherNo" width="140" />
        <el-table-column label="姓名" prop="name" width="120" />
        <el-table-column label="性别" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="genderTag(row.gender)" size="small">{{ genderLabel(row.gender) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="所属院系" min-width="160">
          <template #default="{ row }">{{ row.department?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="职称" width="120">
          <template #default="{ row }">{{ row.title || '—' }}</template>
        </el-table-column>
        <el-table-column label="联系电话" prop="phone" width="140">
          <template #default="{ row }">{{ row.phone || '—' }}</template>
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
        <el-form-item label="工号" prop="teacherNo">
          <el-input v-model="form.teacherNo" placeholder="请输入工号" maxlength="30" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" maxlength="30" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio :value="'MALE'">男</el-radio>
            <el-radio :value="'FEMALE'">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="所属院系" prop="departmentId">
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
        <el-form-item label="职称" prop="title">
          <el-input v-model="form.title" placeholder="请输入职称，如：教授" maxlength="30" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" maxlength="20" />
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
  listTeachers,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getDepartmentList,
  type TeacherListResult,
} from '@/api/base';
import { Gender } from '@shared-web/types';
import type { Department } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<TeacherListResult[]>([]);
const departments = ref<Department[]>([]);
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
});

const form = reactive({
  teacherNo: '',
  name: '',
  gender: 'MALE' as Gender,
  departmentId: undefined as string | undefined,
  title: '',
  phone: '',
});

const rules: FormRules = {
  teacherNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择所属院系', trigger: 'change' }],
};

const dialogTitle = computed(() => (editingId.value ? '编辑教师' : '新增教师'));

function genderLabel(gender: Gender): string {
  return gender === 'MALE' ? '男' : '女';
}

function genderTag(gender: Gender): 'primary' | 'danger' {
  return gender === 'MALE' ? 'primary' : 'danger';
}

async function loadDepartments(): Promise<void> {
  try {
    departments.value = await getDepartmentList();
  } catch {
    // ignore
  }
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listTeachers({
      page: pagination.page,
      pageSize: pagination.pageSize,
      name: query.name || undefined,
      departmentId: query.departmentId,
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
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

function resetForm(): void {
  form.teacherNo = '';
  form.name = '';
  form.gender = Gender.MALE;
  form.departmentId = undefined;
  form.title = '';
  form.phone = '';
  editingId.value = null;
  formRef.value?.clearValidate();
}

function onAdd(): void {
  resetForm();
  dialogVisible.value = true;
}

function onEdit(row: TeacherListResult): void {
  resetForm();
  editingId.value = row.id;
  form.teacherNo = row.teacherNo;
  form.name = row.name;
  form.gender = row.gender;
  form.departmentId = row.departmentId;
  form.title = row.title || '';
  form.phone = row.phone || '';
  dialogVisible.value = true;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const params = {
      teacherNo: form.teacherNo,
      name: form.name,
      gender: form.gender,
      departmentId: form.departmentId!,
      title: form.title || undefined,
      phone: form.phone || undefined,
    };
    if (editingId.value) {
      await updateTeacher(editingId.value, params);
      ElMessage.success('更新成功');
    } else {
      await createTeacher(params);
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

async function onDelete(row: TeacherListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除教师「${row.name}」？`, '删除确认', { type: 'warning' });
    await deleteTeacher(row.id);
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
.teacher-page {
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
