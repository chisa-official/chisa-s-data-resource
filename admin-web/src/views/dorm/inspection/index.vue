<template>
  <div class="inspection-page">
    <PageHeader title="卫生检查登记" subtitle="宿舍卫生检查记录管理">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="onAdd">登记检查</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.building" placeholder="楼栋" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column label="宿舍" min-width="140">
          <template #default="{ row }">{{ row.dorm?.building }} - {{ row.dorm?.roomNo }}</template>
        </el-table-column>
        <el-table-column label="分数" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="scoreTagType(row.score)" size="small">{{ row.score }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="存在问题" prop="issues" min-width="220" show-overflow-tooltip />
        <el-table-column label="检查时间" width="160">
          <template #default="{ row }">{{ row.inspectedAt?.replace('T', ' ').slice(0, 16) }}</template>
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
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadData"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="formVisible" :title="isEdit ? '编辑检查记录' : '登记卫生检查'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="宿舍" prop="dormId">
          <el-select v-model="form.dormId" :disabled="isEdit" filterable placeholder="选择宿舍" style="width: 100%">
            <el-option v-for="d in dormOptions" :key="d.id" :label="`${d.building} - ${d.roomNo}`" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="分数" prop="score">
          <el-input-number v-model="form.score" :min="0" :max="100" style="width: 100%" />
        </el-form-item>
        <el-form-item label="检查时间" prop="inspectedAt">
          <el-date-picker v-model="form.inspectedAt" type="datetime" placeholder="选择检查时间" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="存在问题">
          <el-input v-model="form.issues" type="textarea" :rows="3" placeholder="存在问题（选填）" />
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
import { Plus, Edit, Delete, Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listInspections, createInspection, updateInspection, deleteInspection, type InspectionResult } from '@/api/dorm';
import { listDorms, type DormListResult } from '@/api/dorm';

const loading = ref(false);
const submitting = ref(false);
const list = ref<InspectionResult[]>([]);
const formVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const editId = ref('');
const dormOptions = ref<DormListResult[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({ building: '' });

const form = reactive({
  dormId: '',
  score: 90,
  issues: '',
  inspectedAt: '',
});

const rules = {
  dormId: [{ required: true, message: '请选择宿舍', trigger: 'change' }],
  score: [{ required: true, message: '请输入分数', trigger: 'blur' }],
  inspectedAt: [{ required: true, message: '请选择检查时间', trigger: 'change' }],
};

function scoreTagType(score: number): 'success' | 'warning' | 'danger' {
  if (score >= 85) return 'success';
  if (score >= 60) return 'warning';
  return 'danger';
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listInspections({
      page: pagination.page,
      pageSize: pagination.pageSize,
      building: query.building || undefined,
    });
    list.value = res.list;
    pagination.total = res.total;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

async function loadDorms(): Promise<void> {
  try {
    const res = await listDorms({ pageSize: 200 });
    dormOptions.value = res.list;
  } catch { /* ignore */ }
}

function onSearch(): void {
  pagination.page = 1;
  loadData();
}

function onReset(): void {
  query.building = '';
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

function onAdd(): void {
  isEdit.value = false;
  editId.value = '';
  form.dormId = '';
  form.score = 90;
  form.issues = '';
  form.inspectedAt = '';
  formVisible.value = true;
}

function onEdit(row: InspectionResult): void {
  isEdit.value = true;
  editId.value = row.id;
  form.dormId = row.dormId;
  form.score = row.score;
  form.issues = row.issues || '';
  form.inspectedAt = row.inspectedAt?.slice(0, 19) || '';
  formVisible.value = true;
}

async function onSubmit(): Promise<void> {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    if (isEdit.value) {
      await updateInspection(editId.value, { score: form.score, issues: form.issues, inspectedAt: form.inspectedAt });
      ElMessage.success('更新成功');
    } else {
      await createInspection({ ...form });
      ElMessage.success('登记成功');
    }
    formVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

async function onDelete(row: InspectionResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除「${row.dorm?.building}-${row.dorm?.roomNo}」的检查记录？`, '删除确认', { type: 'warning' });
    await deleteInspection(row.id);
    ElMessage.success('已删除');
    await loadData();
  } catch { /* cancel */ }
}

onMounted(() => {
  loadData();
  loadDorms();
});
</script>

<style scoped lang="scss">
.inspection-page {
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
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
