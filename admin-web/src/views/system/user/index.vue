<template>
  <div class="page-container">
    <PageHeader title="用户管理" subtitle="管理后台管理员账号" />

    <!-- 搜索栏 -->
    <el-card shadow="never" class="search-card">
      <el-form :inline="true" :model="query" @submit.prevent>
        <el-form-item label="用户名">
          <el-input v-model="query.username" placeholder="请输入用户名" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="query.realName" placeholder="请输入姓名" clearable @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="启用" value="ACTIVE" />
            <el-option label="禁用" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="query.roleId" placeholder="全部" clearable filterable style="width: 180px">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon><span>查询</span>
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon><span>重置</span>
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="table-card">
      <div class="table-toolbar">
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon><span>新增用户</span>
        </el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" border stripe row-key="id">
        <el-table-column label="用户名" prop="username" min-width="120" />
        <el-table-column label="姓名" prop="realName" min-width="100" />
        <el-table-column label="角色" min-width="120">
          <template #default="{ row }">
            <el-tag v-if="row.role" size="small" effect="plain">{{ row.role.name }}</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="手机号" prop="phone" min-width="130">
          <template #default="{ row }">{{ row.phone || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" min-width="90">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
              {{ row.status === 'ACTIVE' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" min-width="170">
          <template #default="{ row }">{{ formatDate(row.lastLoginAt) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button link :type="row.status === 'ACTIVE' ? 'warning' : 'success'" size="small" @click="handleToggle(row)">
              {{ row.status === 'ACTIVE' ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增用户' : '编辑用户'" width="520px" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="dialogMode === 'edit'" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="dialogMode === 'create' ? '请输入密码' : '留空则不修改密码'"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入真实姓名" />
        </el-form-item>
        <el-form-item label="角色" prop="roleId">
          <el-select v-model="form.roleId" placeholder="请选择角色" filterable style="width: 100%">
            <el-option v-for="r in roles" :key="r.id" :label="r.name" :value="r.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  type UserListParams,
  type UserListResult,
  type CreateUserParams,
  type UpdateUserParams,
} from '@/api/system/user';
import { listRoles, type RoleListResult } from '@/api/system/role';

const loading = ref(false);
const submitting = ref(false);
const tableData = ref<UserListResult[]>([]);
const total = ref(0);
const roles = ref<RoleListResult[]>([]);

const query = reactive({
  page: 1,
  pageSize: 10,
  username: '',
  realName: '',
  status: '',
  roleId: '',
});

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formRef = ref<FormInstance>();

const form = reactive({
  id: '',
  username: '',
  password: '',
  realName: '',
  roleId: '',
  phone: '',
});

const rules = computed<FormRules>(() => ({
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password:
    dialogMode.value === 'create'
      ? [{ required: true, message: '请输入密码', trigger: 'blur' }]
      : [],
  realName: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  roleId: [{ required: true, message: '请选择角色', trigger: 'change' }],
}));

function formatDate(date?: string): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('zh-CN');
}

function buildParams(): UserListParams {
  const params: UserListParams = { page: query.page, pageSize: query.pageSize };
  if (query.username) params.username = query.username;
  if (query.realName) params.realName = query.realName;
  if (query.status) params.status = query.status;
  if (query.roleId) params.roleId = query.roleId;
  return params;
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await listUsers(buildParams());
    tableData.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function loadRoles(): Promise<void> {
  roles.value = await listRoles();
}

function handleSearch(): void {
  query.page = 1;
  fetchList();
}

function handleReset(): void {
  query.username = '';
  query.realName = '';
  query.status = '';
  query.roleId = '';
  query.page = 1;
  fetchList();
}

function handleSizeChange(): void {
  query.page = 1;
  fetchList();
}

function resetForm(): void {
  form.id = '';
  form.username = '';
  form.password = '';
  form.realName = '';
  form.roleId = '';
  form.phone = '';
  formRef.value?.clearValidate();
}

function openCreate(): void {
  dialogMode.value = 'create';
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: UserListResult): void {
  dialogMode.value = 'edit';
  resetForm();
  form.id = row.id;
  form.username = row.username;
  form.realName = row.realName;
  form.roleId = row.roleId;
  form.phone = row.phone || '';
  dialogVisible.value = true;
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    if (dialogMode.value === 'create') {
      const params: CreateUserParams = {
        username: form.username,
        password: form.password,
        realName: form.realName,
        roleId: form.roleId,
        phone: form.phone || undefined,
      };
      await createUser(params);
      ElMessage.success('新增成功');
    } else {
      const params: UpdateUserParams = {
        realName: form.realName,
        roleId: form.roleId,
        phone: form.phone || undefined,
      };
      if (form.password) params.password = form.password;
      await updateUser(form.id, params);
      ElMessage.success('更新成功');
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    submitting.value = false;
  }
}

async function handleToggle(row: UserListResult): Promise<void> {
  try {
    await toggleUserStatus(row.id);
    ElMessage.success(row.status === 'ACTIVE' ? '已禁用' : '已启用');
    fetchList();
  } catch {
    // 错误提示由请求拦截器处理
  }
}

async function handleDelete(row: UserListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要删除用户「${row.username}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    await deleteUser(row.id);
    ElMessage.success('删除成功');
    fetchList();
  } catch {
    // 用户取消或请求失败
  }
}

onMounted(() => {
  loadRoles();
  fetchList();
});
</script>

<style scoped lang="scss">
.page-container {
  .search-card {
    margin-bottom: 16px;
    :deep(.el-form--inline .el-form-item) {
      margin-bottom: 0;
    }
  }

  .table-card {
    .table-toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
      .el-button .el-icon {
        margin-right: 4px;
      }
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}

:deep(.el-button .el-icon) {
  margin-right: 4px;
  vertical-align: middle;
}
</style>
