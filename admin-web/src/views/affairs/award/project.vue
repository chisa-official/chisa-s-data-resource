<template>
  <div class="project-page">
    <PageHeader title="奖助贷项目设置" subtitle="维护奖学金/助学金/助学贷款/评优项目">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="onAdd">新增项目</el-button>
      </template>
    </PageHeader>

    <el-card>
      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column label="项目名称" prop="name" min-width="180" />
        <el-table-column label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.awardType)" size="small">{{ typeText(row.awardType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额（元）" width="120" align="right">
          <template #default="{ row }">{{ row.amount != null ? row.amount.toLocaleString() : '—' }}</template>
        </el-table-column>
        <el-table-column label="说明" prop="description" min-width="200" show-overflow-tooltip />
        <el-table-column label="排序" prop="sort" width="80" align="center" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link :icon="Edit" @click="onEdit(row)">编辑</el-button>
            <el-button type="danger" link :icon="Delete" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="formVisible" :title="isEdit ? '编辑项目' : '新增项目'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="如：国家奖学金" />
        </el-form-item>
        <el-form-item label="项目类型" prop="awardType">
          <el-select v-model="form.awardType" placeholder="选择类型" style="width: 100%">
            <el-option label="奖学金" value="SCHOLARSHIP" />
            <el-option label="助学金" value="AID" />
            <el-option label="助学贷款" value="LOAN" />
            <el-option label="评优" value="HONOR" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额（元）">
          <el-input-number v-model="form.amount" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="项目说明（选填）" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { Plus, Edit, Delete } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listAwardProjects, createAwardProject, updateAwardProject, deleteAwardProject, type AwardProject } from '@/api/affairs';
import { AwardType } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<AwardProject[]>([]);
const formVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const editId = ref('');

const form = reactive({
  name: '',
  awardType: 'SCHOLARSHIP' as AwardType,
  amount: undefined as number | undefined,
  description: '',
  sort: 0,
});

const rules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  awardType: [{ required: true, message: '请选择项目类型', trigger: 'change' }],
};

const typeText = (t: AwardType): string => ({ SCHOLARSHIP: '奖学金', AID: '助学金', LOAN: '助学贷款', HONOR: '评优' } as any)[t];
const typeTagType = (t: AwardType): 'success' | 'warning' | 'info' | 'danger' => {
  if (t === 'SCHOLARSHIP') return 'success';
  if (t === 'AID') return 'warning';
  if (t === 'LOAN') return 'info';
  return 'danger';
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    list.value = await listAwardProjects();
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

function onAdd(): void {
  isEdit.value = false;
  editId.value = '';
  form.name = '';
  form.awardType = 'SCHOLARSHIP';
  form.amount = undefined;
  form.description = '';
  form.sort = 0;
  formVisible.value = true;
}

function onEdit(row: AwardProject): void {
  isEdit.value = true;
  editId.value = row.id;
  form.name = row.name;
  form.awardType = row.awardType;
  form.amount = row.amount;
  form.description = row.description || '';
  form.sort = row.sort;
  formVisible.value = true;
}

async function onSubmit(): Promise<void> {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    if (isEdit.value) {
      await updateAwardProject(editId.value, { ...form });
      ElMessage.success('更新成功');
    } else {
      await createAwardProject({ ...form });
      ElMessage.success('创建成功');
    }
    formVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

async function onDelete(row: AwardProject): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除项目「${row.name}」？`, '删除确认', { type: 'warning' });
    await deleteAwardProject(row.id);
    ElMessage.success('已删除');
    await loadData();
  } catch { /* cancel */ }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.project-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
</style>
