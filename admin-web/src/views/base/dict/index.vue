<template>
  <div class="dict-page">
    <PageHeader title="字典管理" subtitle="维护系统字典类型与字典项" />

    <el-row :gutter="16">
      <el-col :span="6">
        <el-card v-loading="typeLoading" class="type-panel">
          <template #header>
            <div class="type-panel__header">
              <span>字典类型</span>
              <el-button type="primary" link :icon="Plus" @click="onAddType">新建类型</el-button>
            </div>
          </template>
          <div
            v-for="t in typeList"
            :key="t.type"
            class="type-item"
            :class="{ 'type-item--active': activeType === t.type }"
            @click="onSelectType(t.type)"
          >
            <span class="type-item__name">{{ t.type }}</span>
            <el-badge :value="t.items.length" :max="999" class="type-item__badge" />
          </div>
          <el-empty v-if="!typeLoading && !typeList.length" description="暂无字典类型" :image-size="60" />
        </el-card>
      </el-col>

      <el-col :span="18">
        <el-card>
          <template #header>
            <div class="items-panel__header">
              <span>{{ activeType ? `字典项 - ${activeType}` : '请选择左侧字典类型' }}</span>
              <el-button
                v-if="activeType"
                type="primary"
                :icon="Plus"
                @click="onAddItem"
              >
                新增字典项
              </el-button>
            </div>
          </template>

          <el-table v-loading="loading" :data="currentItems" border style="width: 100%">
            <el-table-column label="字典标签" prop="label" min-width="160" />
            <el-table-column label="字典值" prop="value" min-width="140" />
            <el-table-column label="排序" prop="sort" width="100" align="center" />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link :icon="Edit" @click="onEditItem(row)">编辑</el-button>
                <el-button type="danger" link :icon="Delete" @click="onDeleteItem(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty
            v-if="!loading && activeType && !currentItems.length"
            description="该类型下暂无字典项"
            :image-size="80"
          />
          <el-empty
            v-if="!activeType"
            description="请先在左侧选择字典类型"
            :image-size="80"
          />
        </el-card>
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="字典类型" prop="type">
          <el-input
            v-model="form.type"
            placeholder="请输入字典类型，如：gender"
            :disabled="!!editingId"
            maxlength="50"
          />
        </el-form-item>
        <el-form-item label="字典标签" prop="label">
          <el-input v-model="form.label" placeholder="请输入字典标签，如：男" maxlength="50" />
        </el-form-item>
        <el-form-item label="字典值" prop="value">
          <el-input v-model="form.value" placeholder="请输入字典值，如：MALE" maxlength="50" />
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
import { Plus, Edit, Delete } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listDicts,
  createDict,
  updateDict,
  deleteDict,
  type Dict,
} from '@/api/base';

interface TypeGroup {
  type: string;
  items: Dict[];
}

const loading = ref(false);
const typeLoading = ref(false);
const submitting = ref(false);
const allDicts = ref<Dict[]>([]);
const activeType = ref<string>('');
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();
const editingId = ref<string | null>(null);

const form = reactive({
  type: '',
  label: '',
  value: '',
  sort: 0,
});

const rules: FormRules = {
  type: [{ required: true, message: '请输入字典类型', trigger: 'blur' }],
  label: [{ required: true, message: '请输入字典标签', trigger: 'blur' }],
  value: [{ required: true, message: '请输入字典值', trigger: 'blur' }],
};

const typeList = computed<TypeGroup[]>(() => {
  const map = new Map<string, Dict[]>();
  for (const d of allDicts.value) {
    if (!map.has(d.type)) {
      map.set(d.type, []);
    }
    map.get(d.type)!.push(d);
  }
  const result: TypeGroup[] = [];
  for (const [type, items] of map.entries()) {
    result.push({
      type,
      items: items.sort((a, b) => a.sort - b.sort),
    });
  }
  result.sort((a, b) => a.type.localeCompare(b.type));
  return result;
});

const currentItems = computed<Dict[]>(() => {
  if (!activeType.value) return [];
  return typeList.value.find((t) => t.type === activeType.value)?.items || [];
});

const dialogTitle = computed(() => (editingId.value ? '编辑字典项' : '新增字典项'));

async function loadAll(): Promise<void> {
  typeLoading.value = true;
  loading.value = true;
  try {
    allDicts.value = await listDicts();
    // 若当前已选类型失效，自动切换到第一个
    if (activeType.value && !typeList.value.some((t) => t.type === activeType.value)) {
      activeType.value = typeList.value[0]?.type || '';
    } else if (!activeType.value && typeList.value.length) {
      activeType.value = typeList.value[0].type;
    }
  } catch {
    // ignore
  } finally {
    typeLoading.value = false;
    loading.value = false;
  }
}

function onSelectType(type: string): void {
  activeType.value = type;
}

function resetForm(): void {
  form.type = activeType.value || '';
  form.label = '';
  form.value = '';
  form.sort = 0;
  editingId.value = null;
  formRef.value?.clearValidate();
}

function onAddType(): void {
  resetForm();
  form.type = '';
  dialogVisible.value = true;
}

function onAddItem(): void {
  resetForm();
  form.type = activeType.value;
  dialogVisible.value = true;
}

function onEditItem(row: Dict): void {
  resetForm();
  editingId.value = row.id;
  form.type = row.type;
  form.label = row.label;
  form.value = row.value;
  form.sort = row.sort;
  dialogVisible.value = true;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    const params = {
      type: form.type,
      label: form.label,
      value: form.value,
      sort: form.sort,
    };
    if (editingId.value) {
      await updateDict(editingId.value, params);
      ElMessage.success('更新成功');
    } else {
      await createDict(params);
      ElMessage.success('新增成功');
    }
    dialogVisible.value = false;
    const prevType = form.type;
    await loadAll();
    // 新建后保持当前选中的类型
    if (!activeType.value && prevType) {
      activeType.value = prevType;
    }
  } catch {
    // ignore
  } finally {
    submitting.value = false;
  }
}

async function onDeleteItem(row: Dict): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除字典项「${row.label}」？`, '删除确认', { type: 'warning' });
    await deleteDict(row.id);
    ElMessage.success('删除成功');
    await loadAll();
  } catch {
    // 取消或失败
  }
}

onMounted(() => {
  loadAll();
});
</script>

<style scoped lang="scss">
.dict-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.type-panel {
  height: 100%;
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
}
.type-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
  &__name {
    font-size: 14px;
    color: #303133;
    word-break: break-all;
  }
  &__badge {
    margin-left: 8px;
  }
  &:hover {
    background: #f5f7fa;
  }
  &--active {
    background: #ecf5ff;
    .type-item__name {
      color: #409eff;
      font-weight: 600;
    }
  }
}
.items-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
