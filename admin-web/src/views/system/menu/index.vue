<template>
  <div class="page-container">
    <PageHeader title="菜单管理" subtitle="管理系统菜单与权限标识" />

    <el-card shadow="never" class="table-card">
      <div class="table-toolbar">
        <el-button type="primary" @click="openCreate(null)">
          <el-icon><Plus /></el-icon><span>新增菜单</span>
        </el-button>
        <el-button @click="fetchList">
          <el-icon><Refresh /></el-icon><span>刷新</span>
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="tableData"
        row-key="id"
        border
        :tree-props="{ children: 'children' }"
        default-expand-all
      >
        <el-table-column label="菜单名称" prop="name" min-width="180" />
        <el-table-column label="图标" prop="icon" width="100" align="center">
          <template #default="{ row }">
            <el-icon v-if="row.icon" :size="16"><component :is="row.icon" /></el-icon>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="menuTypeTagType(row.type)" size="small" effect="plain">
              {{ menuTypeLabel(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="路由路径" prop="path" min-width="160">
          <template #default="{ row }">{{ row.path || '—' }}</template>
        </el-table-column>
        <el-table-column label="组件" prop="component" min-width="180">
          <template #default="{ row }">{{ row.component || '—' }}</template>
        </el-table-column>
        <el-table-column label="权限标识" prop="permission" min-width="180">
          <template #default="{ row }">
            <el-tag v-if="row.permission" size="small" type="info" effect="plain">{{ row.permission }}</el-tag>
            <span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="排序" prop="sort" width="80" align="center" />
        <el-table-column label="显示" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.visible ? 'success' : 'info'" size="small">{{ row.visible ? '显示' : '隐藏' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openCreate(row)">
              <el-icon><Plus /></el-icon>新增
            </el-button>
            <el-button link type="primary" size="small" @click="openEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增菜单' : '编辑菜单'" width="560px" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="上级菜单" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="parentOptions"
            node-key="id"
            :props="{ label: 'name', children: 'children' }"
            check-strictly
            clearable
            placeholder="留空为根级菜单"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="菜单类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio-button :value="MenuType.DIRECTORY">目录</el-radio-button>
            <el-radio-button :value="MenuType.MENU">菜单</el-radio-button>
            <el-radio-button :value="MenuType.BUTTON">按钮</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item v-if="form.type !== MenuType.BUTTON" label="路由路径" prop="path">
          <el-input v-model="form.path" placeholder="例如：/system/user" />
        </el-form-item>
        <el-form-item v-if="form.type === MenuType.MENU" label="组件路径" prop="component">
          <el-input v-model="form.component" placeholder="例如：system/user/index" />
        </el-form-item>
        <el-form-item v-if="form.type !== MenuType.BUTTON" label="图标" prop="icon">
          <el-input v-model="form.icon" placeholder="Element Plus 图标名，例如：User" />
        </el-form-item>
        <el-form-item v-if="form.type === MenuType.BUTTON" label="权限标识" prop="permission">
          <el-input v-model="form.permission" placeholder="例如：system:user:add" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
        <el-form-item v-if="form.type !== MenuType.BUTTON" label="是否显示" prop="visible">
          <el-switch v-model="form.visible" />
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
import { getMenuTree, createMenu, updateMenu, deleteMenu, type CreateMenuParams } from '@/api/system/menu';
import { MenuType, type Menu } from '@shared-web/types';

const menuTypeMap: Record<string, { label: string; tag: 'primary' | 'success' | 'warning' }> = {
  DIRECTORY: { label: '目录', tag: 'primary' },
  MENU: { label: '菜单', tag: 'success' },
  BUTTON: { label: '按钮', tag: 'warning' },
};

function menuTypeLabel(type: string): string {
  return menuTypeMap[type]?.label || type;
}

function menuTypeTagType(type: string): 'primary' | 'success' | 'warning' {
  return menuTypeMap[type]?.tag || 'primary';
}

const loading = ref(false);
const submitting = ref(false);
const tableData = ref<Menu[]>([]);

const dialogVisible = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const formRef = ref<FormInstance>();

const form = reactive({
  id: '',
  parentId: '' as string,
  name: '',
  type: MenuType.MENU as MenuType,
  path: '',
  component: '',
  icon: '',
  sort: 0,
  permission: '',
  visible: true,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
};

// 上级菜单可选项与表格数据共享同一棵树
const parentOptions = computed<Menu[]>(() => tableData.value);

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    tableData.value = await getMenuTree();
  } finally {
    loading.value = false;
  }
}

function resetForm(): void {
  form.id = '';
  form.parentId = '';
  form.name = '';
  form.type = MenuType.MENU;
  form.path = '';
  form.component = '';
  form.icon = '';
  form.sort = 0;
  form.permission = '';
  form.visible = true;
  formRef.value?.clearValidate();
}

function openCreate(parent: Menu | null): void {
  dialogMode.value = 'create';
  resetForm();
  form.parentId = parent?.id || '';
  form.type = parent ? MenuType.MENU : MenuType.DIRECTORY;
  dialogVisible.value = true;
}

function openEdit(row: Menu): void {
  dialogMode.value = 'edit';
  resetForm();
  form.id = row.id;
  form.parentId = row.parentId || '';
  form.name = row.name;
  form.type = row.type;
  form.path = row.path || '';
  form.component = row.component || '';
  form.icon = row.icon || '';
  form.sort = row.sort;
  form.permission = row.permission || '';
  form.visible = row.visible;
  dialogVisible.value = true;
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const params: CreateMenuParams = {
      parentId: form.parentId || null,
      name: form.name,
      type: form.type,
      path: form.path || undefined,
      component: form.component || undefined,
      icon: form.icon || undefined,
      sort: form.sort,
      permission: form.permission || undefined,
      visible: form.visible,
    };
    if (dialogMode.value === 'create') {
      await createMenu(params);
      ElMessage.success('新增成功');
    } else {
      await updateMenu(form.id, params);
      ElMessage.success('更新成功');
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(row: Menu): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定要删除菜单「${row.name}」吗？子菜单也将被删除。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    });
    await deleteMenu(row.id);
    ElMessage.success('删除成功');
    fetchList();
  } catch {
    // 用户取消或请求失败
  }
}

onMounted(() => {
  fetchList();
});
</script>

<style scoped lang="scss">
.page-container {
  .table-card {
    .table-toolbar {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
  }
}

:deep(.el-button .el-icon) {
  margin-right: 4px;
  vertical-align: middle;
}
</style>
