<template>
  <div class="page-container">
    <PageHeader title="角色管理" subtitle="管理系统角色及菜单权限" />

    <el-card shadow="never" class="table-card">
      <div class="table-toolbar">
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon><span>新增角色</span>
        </el-button>
      </div>

      <el-table v-loading="loading" :data="tableData" border stripe row-key="id">
        <el-table-column label="角色名称" prop="name" min-width="140" />
        <el-table-column label="角色编码" prop="code" min-width="160">
          <template #default="{ row }">
            <el-tag v-if="row.code === 'SUPER_ADMIN'" type="danger" size="small" effect="plain">SUPER_ADMIN</el-tag>
            <span v-else>{{ row.code }}</span>
          </template>
        </el-table-column>
        <el-table-column label="数据范围" min-width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain" :type="dataScopeTagType(row.dataScope)">
              {{ dataScopeLabel(row.dataScope) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户数" prop="adminCount" min-width="90" align="center">
          <template #default="{ row }">{{ row.adminCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" :disabled="row.code === 'SUPER_ADMIN'" @click="openEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button link type="success" size="small" @click="openAssignMenus(row)">
              <el-icon><Share /></el-icon>分配菜单
            </el-button>
            <el-button link type="danger" size="small" :disabled="row.code === 'SUPER_ADMIN'" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增角色' : '编辑角色'" width="480px" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色编码" prop="code">
          <el-input v-model="form.code" :disabled="dialogMode === 'edit'" placeholder="例如：DEPT_ADMIN" />
        </el-form-item>
        <el-form-item label="数据范围" prop="dataScope">
          <el-select v-model="form.dataScope" placeholder="请选择数据范围" style="width: 100%">
            <el-option v-for="item in dataScopeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配菜单弹窗 -->
    <el-dialog v-model="assignVisible" :title="`分配菜单 - ${currentRole?.name || ''}`" width="480px">
      <el-tree
        ref="menuTreeRef"
        :data="menuTreeData"
        show-checkbox
        node-key="id"
        default-expand-all
        :props="{ label: 'name', children: 'children' }"
        empty-text="暂无菜单数据"
      />
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="assigning" @click="handleAssignMenus">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox, ElTree, type FormInstance, type FormRules } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listRoles,
  createRole,
  updateRole,
  assignRoleMenus,
  deleteRole,
  type RoleListResult,
  type CreateRoleParams,
  type UpdateRoleParams,
} from '@/api/system/role';
import { getMenuTree } from '@/api/system/menu';
import { DataScope, type Menu } from '@shared-web/types';

type DataScopeOption = { value: DataScope; label: string };

const dataScopeOptions: DataScopeOption[] = [
  { value: DataScope.ALL, label: '全部数据' },
  { value: DataScope.DEPARTMENT, label: '本部门数据' },
  { value: DataScope.SELF, label: '仅本人' },
];

const dataScopeMap: Record<string, string> = {
  ALL: '全部数据',
  DEPARTMENT: '本部门数据',
  SELF: '仅本人',
};

function dataScopeLabel(scope: string): string {
  return dataScopeMap[scope] || scope;
}

function dataScopeTagType(scope: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' {
  if (scope === 'ALL') return 'danger';
  if (scope === 'DEPARTMENT') return 'warning';
  return 'info';
}

const loading = ref(false);
const submitting = ref(false);
const assigning = ref(false);
const tableData = ref<RoleListResult[]>([]);

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formRef = ref<FormInstance>();

const form = reactive({
  id: '',
  name: '',
  code: '',
  dataScope: DataScope.SELF,
});

const rules = computed<FormRules>(() => ({
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入角色编码', trigger: 'blur' }],
  dataScope: [{ required: true, message: '请选择数据范围', trigger: 'change' }],
}));

// 分配菜单相关
const assignVisible = ref(false);
const currentRole = ref<RoleListResult | null>(null);
const menuTreeData = ref<Menu[]>([]);
const menuTreeRef = ref<InstanceType<typeof ElTree>>();

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    tableData.value = await listRoles();
  } finally {
    loading.value = false;
  }
}

async function loadMenuTree(): Promise<void> {
  menuTreeData.value = await getMenuTree();
}

function resetForm(): void {
  form.id = '';
  form.name = '';
  form.code = '';
  form.dataScope = DataScope.SELF;
  formRef.value?.clearValidate();
}

function openCreate(): void {
  dialogMode.value = 'create';
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: RoleListResult): void {
  if (row.code === 'SUPER_ADMIN') {
    ElMessage.warning('超级管理员角色不可编辑');
    return;
  }
  dialogMode.value = 'edit';
  resetForm();
  form.id = row.id;
  form.name = row.name;
  form.code = row.code;
  form.dataScope = row.dataScope;
  dialogVisible.value = true;
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    if (dialogMode.value === 'create') {
      const params: CreateRoleParams = {
        name: form.name,
        code: form.code,
        dataScope: form.dataScope,
      };
      await createRole(params);
      ElMessage.success('新增成功');
    } else {
      const params: UpdateRoleParams = {
        name: form.name,
        dataScope: form.dataScope,
      };
      await updateRole(form.id, params);
      ElMessage.success('更新成功');
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    submitting.value = false;
  }
}

function openAssignMenus(row: RoleListResult): void {
  currentRole.value = row;
  assignVisible.value = true;
  nextTick(() => {
    menuTreeRef.value?.setCheckedKeys(row.menus || [], false);
  });
}

async function handleAssignMenus(): Promise<void> {
  if (!currentRole.value || !menuTreeRef.value) return;
  assigning.value = true;
  try {
    const checked = menuTreeRef.value.getCheckedKeys() as string[];
    const halfChecked = menuTreeRef.value.getHalfCheckedKeys() as string[];
    const menuIds = [...checked, ...halfChecked];
    await assignRoleMenus(currentRole.value.id, menuIds);
    ElMessage.success('菜单分配成功');
    assignVisible.value = false;
    fetchList();
  } finally {
    assigning.value = false;
  }
}

async function handleDelete(row: RoleListResult): Promise<void> {
  if (row.code === 'SUPER_ADMIN') {
    ElMessage.warning('超级管理员角色不可删除');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定要删除角色「${row.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    await deleteRole(row.id);
    ElMessage.success('删除成功');
    fetchList();
  } catch {
    // 用户取消或请求失败
  }
}

onMounted(() => {
  fetchList();
  loadMenuTree();
});
</script>

<style scoped lang="scss">
.page-container {
  .table-card {
    .table-toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }
  }
}

:deep(.el-button .el-icon) {
  margin-right: 4px;
  vertical-align: middle;
}
</style>
