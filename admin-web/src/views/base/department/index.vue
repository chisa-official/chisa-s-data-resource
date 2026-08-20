<template>
  <div class="department-page">
    <PageHeader title="院系管理" subtitle="维护院系树形结构">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="onAdd(null)">新增顶级院系</el-button>
        <el-button :icon="Refresh" @click="loadData">刷新</el-button>
      </template>
    </PageHeader>

    <el-card>
      <el-table
        v-loading="loading"
        :data="tree"
        row-key="id"
        :tree-props="{ children: 'children' }"
        border
        default-expand-all
        style="width: 100%"
      >
        <el-table-column label="院系名称" prop="name" min-width="220" />
        <el-table-column label="编码" prop="code" width="160" />
        <el-table-column label="排序" prop="sort" width="100" align="center" />
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Plus" @click="onAdd(row)">新增子级</el-button>
            <el-button type="primary" link :icon="Edit" @click="onEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !tree.length" description="暂无院系数据" />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="500px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="上级院系" prop="parentId">
          <el-tree-select
            v-model="form.parentId"
            :data="parentTreeOptions"
            :props="{ value: 'id', label: 'name', children: 'children' }"
            check-strictly
            clearable
            placeholder="不选则为顶级院系"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="院系名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入院系名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="院系编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入院系编码" maxlength="50" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="9999" />
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
import { Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  getDepartmentTree,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '@/api/base';
import type { Department } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const tree = ref<Department[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<string | null>(null);

const form = reactive({
  parentId: undefined as string | undefined,
  name: '',
  code: '',
  sort: 0,
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入院系名称', trigger: 'blur' }],
  code: [{ required: true, message: '请输入院系编码', trigger: 'blur' }],
};

const dialogTitle = computed(() => (editingId.value ? '编辑院系' : '新增院系'));

// 父级下拉树：增加一个虚拟根节点，便于选择顶级
const parentTreeOptions = computed<Department[]>(() => {
  return tree.value;
});

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    tree.value = await getDepartmentTree();
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

function resetForm(): void {
  form.parentId = undefined;
  form.name = '';
  form.code = '';
  form.sort = 0;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function onAdd(row: Department | null): void {
  resetForm();
  if (row) {
    form.parentId = row.id;
  }
  dialogVisible.value = true;
}

function onEdit(row: Department): void {
  resetForm();
  editingId.value = row.id;
  form.parentId = row.parentId || undefined;
  form.name = row.name;
  form.code = row.code;
  form.sort = row.sort;
  dialogVisible.value = true;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    if (editingId.value) {
      // 更新时支持将 parentId 置空（设为 null 表示顶级）
      await updateDepartment(editingId.value, {
        name: form.name,
        code: form.code,
        parentId: form.parentId || null,
        sort: form.sort,
      });
      ElMessage.success('更新成功');
    } else {
      // 新建时 parentId 为 undefined 表示顶级
      await createDepartment({
        name: form.name,
        code: form.code,
        parentId: form.parentId,
        sort: form.sort,
      });
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

async function onDelete(row: Department): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除院系「${row.name}」？删除后其子级也将一并删除。`, '删除确认', {
      type: 'warning',
    });
    await deleteDepartment(row.id);
    ElMessage.success('删除成功');
    await loadData();
  } catch {
    // 取消或失败
  }
}

onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
.department-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
</style>
