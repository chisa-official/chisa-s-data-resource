<template>
  <div class="student-page">
    <PageHeader title="学生档案" subtitle="维护学生档案信息，支持 Excel 批量导入/导出" />

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 160px" @keyup.enter="onSearch" />
        <el-input v-model="query.name" placeholder="姓名" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-select v-model="query.departmentId" placeholder="院系" clearable filterable style="width: 200px" @change="onSearch">
          <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
        <el-select v-model="query.status" placeholder="学籍状态" clearable style="width: 140px" @change="onSearch">
          <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
        <div class="search-bar__right">
          <el-upload :show-file-list="false" :before-upload="onImport" accept=".xlsx,.xls">
            <el-button :icon="Upload">导入</el-button>
          </el-upload>
          <el-button :icon="Download" @click="onExport">导出</el-button>
          <el-button :icon="Document" @click="onDownloadTemplate">模板</el-button>
          <el-button type="primary" :icon="Plus" @click="onAdd">新增</el-button>
        </div>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column prop="studentNo" label="学号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column label="性别" width="80" align="center">
          <template #default="{ row }">{{ row.gender === 'MALE' ? '男' : '女' }}</template>
        </el-table-column>
        <el-table-column label="院系" min-width="140">
          <template #default="{ row }">{{ row.department?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="班级" min-width="140">
          <template #default="{ row }">{{ row.class?.name || '—' }}</template>
        </el-table-column>
        <el-table-column label="手机号" prop="phone" width="130" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="入学日期" width="120">
          <template #default="{ row }">{{ row.enrollDate ? row.enrollDate.slice(0, 10) : '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="onEdit(row)">编辑</el-button>
            <el-button type="warning" link :icon="Key" @click="onResetPwd(row)">重置密码</el-button>
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
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="学号" prop="studentNo">
              <el-input v-model="form.studentNo" :disabled="!!editingId" placeholder="学号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" prop="name">
              <el-input v-model="form.name" placeholder="姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别" prop="gender">
              <el-radio-group v-model="form.gender">
                <el-radio value="MALE">男</el-radio>
                <el-radio value="FEMALE">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入学日期" prop="enrollDate">
              <el-date-picker v-model="form.enrollDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="院系" prop="departmentId">
              <el-select v-model="form.departmentId" placeholder="院系" filterable style="width: 100%" @change="onDeptChange">
                <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="班级" prop="classId">
              <el-select v-model="form.classId" placeholder="班级" filterable style="width: 100%">
                <el-option v-for="c in classOptions" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号"><el-input v-model="form.phone" placeholder="手机号" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="邮箱"><el-input v-model="form.email" placeholder="邮箱" /></el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="籍贯"><el-input v-model="form.hometown" placeholder="籍贯" /></el-form-item>
          </el-col>
          <el-col v-if="editingId" :span="12">
            <el-form-item label="学籍状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option v-for="opt in statusOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="!editingId" :span="12">
            <el-form-item label="初始密码">
              <el-input v-model="form.password" placeholder="留空则默认 123456" />
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
import { Plus, Edit, Delete, Search, Refresh, Upload, Download, Document, Key } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  resetStudentPassword,
  exportStudents,
  downloadStudentTemplate,
  importStudents,
  type StudentListResult,
} from '@/api/status';
import { getDepartmentList, listClasses } from '@/api/base';
import type { Department } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<StudentListResult[]>([]);
const departments = ref<Department[]>([]);
const allClasses = ref<{ id: string; name: string; departmentId: string }[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<string | null>(null);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  name: '',
  departmentId: undefined as string | undefined,
  status: undefined as string | undefined,
});

const form = reactive({
  studentNo: '',
  name: '',
  gender: 'MALE' as 'MALE' | 'FEMALE',
  departmentId: undefined as string | undefined,
  classId: undefined as string | undefined,
  phone: '',
  email: '',
  hometown: '',
  enrollDate: '',
  status: 'NORMAL',
  password: '',
});

const rules: FormRules = {
  studentNo: [{ required: true, message: '请输入学号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  gender: [{ required: true, message: '请选择性别', trigger: 'change' }],
  departmentId: [{ required: true, message: '请选择院系', trigger: 'change' }],
  classId: [{ required: true, message: '请选择班级', trigger: 'change' }],
};

const dialogTitle = computed(() => (editingId.value ? '编辑学生' : '新增学生'));

const statusOptions = [
  { label: '在校', value: 'NORMAL' },
  { label: '休学', value: 'SUSPENDED' },
  { label: '复学', value: 'RESUMED' },
  { label: '退学', value: 'DROPPED' },
  { label: '留级', value: 'HELD_BACK' },
  { label: '毕业', value: 'GRADUATED' },
];

function statusText(s: string): string {
  return statusOptions.find((o) => o.value === s)?.label || s;
}

function statusTagType(s: string): 'success' | 'warning' | 'info' | 'danger' {
  if (s === 'NORMAL') return 'success';
  if (s === 'GRADUATED') return 'info';
  if (s === 'DROPPED') return 'danger';
  return 'warning';
}

const classOptions = computed(() => {
  if (!form.departmentId) return allClasses.value;
  return allClasses.value.filter((c) => c.departmentId === form.departmentId);
});

async function loadDepartments(): Promise<void> {
  try {
    departments.value = await getDepartmentList();
  } catch { /* ignore */ }
}

async function loadClasses(): Promise<void> {
  try {
    const res = await listClasses({ page: 1, pageSize: 1000 });
    allClasses.value = res.list.map((c) => ({ id: c.id, name: c.name, departmentId: c.departmentId }));
  } catch { /* ignore */ }
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listStudents({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      name: query.name || undefined,
      departmentId: query.departmentId,
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
  query.name = '';
  query.departmentId = undefined;
  query.status = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

function onDeptChange(): void {
  form.classId = undefined;
}

function resetForm(): void {
  form.studentNo = '';
  form.name = '';
  form.gender = 'MALE';
  form.departmentId = undefined;
  form.classId = undefined;
  form.phone = '';
  form.email = '';
  form.hometown = '';
  form.enrollDate = '';
  form.status = 'NORMAL';
  form.password = '';
  editingId.value = null;
  formRef.value?.clearValidate();
}

function onAdd(): void {
  resetForm();
  dialogVisible.value = true;
}

function onEdit(row: StudentListResult): void {
  resetForm();
  editingId.value = row.id;
  form.studentNo = row.studentNo;
  form.name = row.name;
  form.gender = row.gender;
  form.departmentId = row.departmentId;
  form.classId = row.classId;
  form.phone = row.phone || '';
  form.email = row.email || '';
  form.hometown = row.hometown || '';
  form.enrollDate = row.enrollDate ? row.enrollDate.slice(0, 10) : '';
  form.status = row.status;
  dialogVisible.value = true;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const params: any = {
      name: form.name,
      gender: form.gender,
      departmentId: form.departmentId,
      classId: form.classId,
      phone: form.phone || undefined,
      email: form.email || undefined,
      hometown: form.hometown || undefined,
      enrollDate: form.enrollDate || undefined,
    };
    if (editingId.value) {
      params.status = form.status;
      await updateStudent(editingId.value, params);
      ElMessage.success('更新成功');
    } else {
      params.studentNo = form.studentNo;
      if (form.password) params.password = form.password;
      await createStudent(params);
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

async function onDelete(row: StudentListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除学生「${row.name}（${row.studentNo}」？若有成绩/选课记录将置为退学。`, '删除确认', { type: 'warning' });
    await deleteStudent(row.id);
    ElMessage.success('操作成功');
    await loadData();
  } catch { /* cancel */ }
}

async function onResetPwd(row: StudentListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认将「${row.name}」的密码重置为默认密码 123456？`, '重置密码', { type: 'warning' });
    await resetStudentPassword(row.id);
    ElMessage.success('密码已重置为 123456');
  } catch { /* cancel */ }
}

async function onExport(): Promise<void> {
  try {
    await exportStudents({
      studentNo: query.studentNo || undefined,
      name: query.name || undefined,
      departmentId: query.departmentId,
      status: query.status,
    });
    ElMessage.success('导出成功');
  } catch { /* ignore */ }
}

async function onDownloadTemplate(): Promise<void> {
  try {
    await downloadStudentTemplate();
  } catch { /* ignore */ }
}

async function onImport(file: File): Promise<boolean> {
  try {
    loading.value = true;
    const result = await importStudents(file);
    ElMessage.success(`导入完成：成功 ${result.successCount} 条，失败 ${result.failCount} 条`);
    if (result.errors.length > 0) {
      const errorText = result.errors.slice(0, 10).map((e) => `第 ${e.row} 行：${e.message}`).join('\n');
      ElMessageBox.alert(errorText, `失败 ${result.failCount} 条详情（前 10 条）`, { type: 'warning' });
    }
    await loadData();
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
  return false; // 阻止 el-upload 默认上传
}

onMounted(() => {
  loadDepartments();
  loadClasses();
  loadData();
});
</script>

<style scoped lang="scss">
.student-page {
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
</style>
