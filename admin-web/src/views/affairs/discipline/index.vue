<template>
  <div class="discipline-page">
    <PageHeader title="违纪处分管理" subtitle="录入与管理学生违纪处分记录">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="onAdd">录入违纪</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-select v-model="query.type" placeholder="处分类型" clearable style="width: 140px" @change="onSearch">
          <el-option label="警告" value="WARNING" />
          <el-option label="严重警告" value="SERIOUS_WARNING" />
          <el-option label="记过" value="DEMERIT" />
          <el-option label="开除" value="EXPEL" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column prop="student.studentNo" label="学号" width="120" />
        <el-table-column prop="student.name" label="姓名" width="100" />
        <el-table-column label="院系/班级" min-width="160">
          <template #default="{ row }">
            {{ row.student?.department?.name || '—' }} / {{ row.student?.class?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="处分类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="违纪原因" prop="reason" min-width="200" show-overflow-tooltip />
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

    <el-dialog v-model="formVisible" :title="isEdit ? '编辑违纪记录' : '录入违纪处分'" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="学生" prop="studentId">
          <el-select
            v-model="form.studentId"
            :disabled="isEdit"
            filterable
            remote
            :remote-method="searchStudent"
            placeholder="输入学号或姓名搜索"
            style="width: 100%"
          >
            <el-option v-for="s in studentOptions" :key="s.id" :label="`${s.studentNo} - ${s.name}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="处分类型" prop="type">
          <el-select v-model="form.type" placeholder="选择处分类型" style="width: 100%">
            <el-option label="警告" value="WARNING" />
            <el-option label="严重警告" value="SERIOUS_WARNING" />
            <el-option label="记过" value="DEMERIT" />
            <el-option label="开除" value="EXPEL" />
          </el-select>
        </el-form-item>
        <el-form-item label="违纪时间" prop="occurredAt">
          <el-date-picker v-model="form.occurredAt" type="datetime" placeholder="选择违纪时间" value-format="YYYY-MM-DDTHH:mm:ss" style="width: 100%" />
        </el-form-item>
        <el-form-item label="违纪原因" prop="reason">
          <el-input v-model="form.reason" type="textarea" :rows="3" placeholder="详细描述违纪情况" />
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
import { listDisciplines, createDiscipline, updateDiscipline, deleteDiscipline, type DisciplineResult } from '@/api/affairs';
import { listStudents } from '@/api/status';
import { DisciplineType } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<DisciplineResult[]>([]);
const formVisible = ref(false);
const isEdit = ref(false);
const formRef = ref<FormInstance>();
const editId = ref('');
const studentOptions = ref<{ id: string; studentNo: string; name: string }[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  studentName: '',
  type: undefined as DisciplineType | undefined,
});

const form = reactive({
  studentId: '',
  type: 'WARNING' as DisciplineType,
  occurredAt: '',
  reason: '',
});

const rules = {
  studentId: [{ required: true, message: '请选择学生', trigger: 'change' }],
  type: [{ required: true, message: '请选择处分类型', trigger: 'change' }],
  occurredAt: [{ required: true, message: '请选择违纪时间', trigger: 'change' }],
  reason: [{ required: true, message: '请输入违纪原因', trigger: 'blur' }],
};

const typeText = (t: DisciplineType): string => ({ WARNING: '警告', SERIOUS_WARNING: '严重警告', DEMERIT: '记过', EXPEL: '开除' } as any)[t];
const typeTagType = (t: DisciplineType): 'info' | 'warning' | 'danger' => {
  if (t === 'WARNING') return 'info';
  if (t === 'SERIOUS_WARNING') return 'warning';
  return 'danger';
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listDisciplines({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      type: query.type,
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
  query.studentName = '';
  query.type = undefined;
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
  form.studentId = '';
  form.type = 'WARNING';
  form.occurredAt = '';
  form.reason = '';
  studentOptions.value = [];
  formVisible.value = true;
}

function onEdit(row: DisciplineResult): void {
  isEdit.value = true;
  editId.value = row.id;
  form.studentId = row.studentId;
  form.type = row.type;
  form.occurredAt = row.occurredAt?.slice(0, 19) || '';
  form.reason = row.reason;
  studentOptions.value = [{ id: row.studentId, studentNo: row.student?.studentNo || '', name: row.student?.name || '' }];
  formVisible.value = true;
}

async function onSubmit(): Promise<void> {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    if (isEdit.value) {
      await updateDiscipline(editId.value, { type: form.type, occurredAt: form.occurredAt, reason: form.reason });
      ElMessage.success('更新成功');
    } else {
      await createDiscipline({ ...form });
      ElMessage.success('录入成功');
    }
    formVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

async function onDelete(row: DisciplineResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除「${row.student?.name}」的违纪记录？`, '删除确认', { type: 'warning' });
    await deleteDiscipline(row.id);
    ElMessage.success('已删除');
    await loadData();
  } catch { /* cancel */ }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.discipline-page {
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
