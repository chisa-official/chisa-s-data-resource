<template>
  <div class="major-page">
    <PageHeader title="专业管理" subtitle="维护各院系下的专业信息" />

    <el-card>
      <div class="search-bar">
        <el-input
          v-model="query.name"
          placeholder="专业名称"
          clearable
          style="width: 200px"
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
          <el-button type="primary" :icon="Plus" @click="onAdd">新增专业</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" border style="width: 100%">
        <el-table-column label="专业名称" prop="name" min-width="180" />
        <el-table-column label="专业编码" prop="code" width="160" />
        <el-table-column label="所属院系" min-width="160">
          <template #default="{ row }">{{ row.department?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="学制(年)" prop="duration" width="110" align="center" />
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
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
        <el-form-item label="专业名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入专业名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="专业编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入专业编码" maxlength="50" />
        </el-form-item>
        <el-form-item label="学制(年)" prop="duration">
          <el-input-number v-model="form.duration" :min="1" :max="8" />
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
  listMajors,
  createMajor,
  updateMajor,
  deleteMajor,
  getDepartmentList,
  type MajorListResult,
} from '@/api/base';
import type { Department } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<MajorListResult[]>([]);
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
  name: '',
  code: '',
  departmentId: undefined as string | undefined,
  duration: 4,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入专业名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入专业编码', trigger: 'blur' }],
  departmentId: [{ required: true, message: '请选择所属院系', trigger: 'change' }],
  duration: [{ required: true, message: '请输入学制', trigger: 'blur' }],
};

const dialogTitle = computed(() => (editingId.value ? '编辑专业' : '新增专业'));

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
    const res = await listMajors({
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
  form.name = '';
  form.code = '';
  form.departmentId = undefined;
  form.duration = 4;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function onAdd(): void {
  resetForm();
  dialogVisible.value = true;
}

function onEdit(row: MajorListResult): void {
  resetForm();
  editingId.value = row.id;
  form.name = row.name;
  form.code = row.code;
  form.departmentId = row.departmentId;
  form.duration = row.duration;
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
      code: form.code,
      departmentId: form.departmentId!,
      duration: form.duration,
    };
    if (editingId.value) {
      await updateMajor(editingId.value, params);
      ElMessage.success('更新成功');
    } else {
      await createMajor(params);
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

async function onDelete(row: MajorListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除专业「${row.name}」？`, '删除确认', { type: 'warning' });
    await deleteMajor(row.id);
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
.major-page {
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
