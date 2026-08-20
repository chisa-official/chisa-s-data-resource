<template>
  <div class="violation-page">
    <PageHeader title="宿舍违纪登记" subtitle="登记与管理宿舍违纪记录">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="onAdd">登记违纪</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.building" placeholder="楼栋" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 120px" @keyup.enter="onSearch" />
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column label="宿舍" width="140">
          <template #default="{ row }">{{ row.dorm?.building }} - {{ row.dorm?.roomNo }}</template>
        </el-table-column>
        <el-table-column label="学生" min-width="160">
          <template #default="{ row }">
            <span v-if="row.student">{{ row.student.studentNo }} - {{ row.student.name }}</span>
            <span v-else class="text-muted">—</span>
          </template>
        </el-table-column>
        <el-table-column label="违纪类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="违纪描述" prop="description" min-width="200" show-overflow-tooltip />
        <el-table-column label="违纪时间" width="160">
          <template #default="{ row }">{{ row.occurredAt?.replace('T', ' ').slice(0, 16) }}</template>
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

    <el-dialog v-model="formVisible" :title="isEdit ? '编辑违纪记录' : '登记违纪'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="宿舍" prop="dormId">
          <el-select v-model="form.dormId" :disabled="isEdit" filterable placeholder="选择宿舍" style="width: 100%">
            <el-option v-for="d in dormOptions" :key="d.id" :label="`${d.building} - ${d.roomNo}`" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="学生">
          <el-select
            v-model="form.studentId"
            clearable
            filterable
            remote
            :remote-method="searchStudent"
            placeholder="输入学号或姓名搜索（选填）"
            style="width: 100%"
          >
            <el-option v-for="s in studentOptions" :key="s.id" :label="`${s.studentNo} - ${s.name}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="违纪类型" prop="type">
          <el-input v-model="form.type" placeholder="如：晚归、违章电器、喧哗" />
        </el-form-item>
        <el-form-item label="违纪时间" prop="occurredAt">
          <el-date-picker v-model="form.occurredAt" type="datetime" placeholder="选择违纪时间" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="违纪描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="详细描述违纪情况" />
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
import { listViolations, createViolation, updateViolation, deleteViolation, listDorms, type ViolationResult, type DormListResult } from '@/api/dorm';
import { listStudents } from '@/api/status';

const loading = ref(false);
const submitting = ref(false);
const list = ref<ViolationResult[]>([]);
const formVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const editId = ref('');
const dormOptions = ref<DormListResult[]>([]);
const studentOptions = ref<{ id: string; studentNo: string; name: string }[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({ building: '', studentNo: '', studentName: '' });

const form = reactive({
  dormId: '',
  studentId: '',
  type: '',
  description: '',
  occurredAt: '',
});

const rules = {
  dormId: [{ required: true, message: '请选择宿舍', trigger: 'change' }],
  type: [{ required: true, message: '请输入违纪类型', trigger: 'blur' }],
  description: [{ required: true, message: '请输入违纪描述', trigger: 'blur' }],
  occurredAt: [{ required: true, message: '请选择违纪时间', trigger: 'change' }],
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listViolations({
      page: pagination.page,
      pageSize: pagination.pageSize,
      building: query.building || undefined,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
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
  query.studentNo = '';
  query.studentName = '';
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

async function searchStudent(keyword: string): Promise<void> {
  if (!keyword) return;
  try {
    const res = await listStudents({ studentNo: keyword, pageSize: 20 });
    studentOptions.value = res.list.map((s) => ({ id: s.id, studentNo: s.studentNo, name: s.name }));
  } catch { /* ignore */ }
}

function onAdd(): void {
  isEdit.value = false;
  editId.value = '';
  form.dormId = '';
  form.studentId = '';
  form.type = '';
  form.description = '';
  form.occurredAt = '';
  studentOptions.value = [];
  formVisible.value = true;
}

function onEdit(row: ViolationResult): void {
  isEdit.value = true;
  editId.value = row.id;
  form.dormId = row.dormId;
  form.studentId = row.studentId || '';
  form.type = row.type;
  form.description = row.description;
  form.occurredAt = row.occurredAt?.slice(0, 19) || '';
  studentOptions.value = row.student ? [{ id: row.student.id, studentNo: row.student.studentNo, name: row.student.name }] : [];
  formVisible.value = true;
}

async function onSubmit(): Promise<void> {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    const payload = {
      dormId: form.dormId,
      studentId: form.studentId || undefined,
      type: form.type,
      description: form.description,
      occurredAt: form.occurredAt,
    };
    if (isEdit.value) {
      await updateViolation(editId.value, { type: form.type, description: form.description, occurredAt: form.occurredAt });
      ElMessage.success('更新成功');
    } else {
      await createViolation(payload);
      ElMessage.success('登记成功');
    }
    formVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

async function onDelete(row: ViolationResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除该违纪记录？`, '删除确认', { type: 'warning' });
    await deleteViolation(row.id);
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
.violation-page {
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
.text-muted {
  color: var(--el-text-color-secondary);
}
</style>
