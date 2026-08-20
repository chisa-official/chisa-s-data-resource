<template>
  <div class="honor-page">
    <PageHeader title="评优评先管理" subtitle="授予与管理学生荣誉称号（复用奖惩模块）">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="onGrant">授予荣誉</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-input v-model="query.semester" placeholder="学期 如 2025-2026-1" clearable style="width: 180px" @keyup.enter="onSearch" />
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
        <el-table-column label="荣誉名称" prop="name" min-width="180" />
        <el-table-column label="学期" prop="semester" width="130" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'danger'" size="small">
              {{ row.status === 'APPROVED' ? '已授予' : row.status === 'PENDING' ? '待审核' : '已驳回' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="评审结果" prop="result" min-width="140" show-overflow-tooltip />
        <el-table-column label="授予时间" width="160">
          <template #default="{ row }">{{ row.createdAt?.replace('T', ' ').slice(0, 16) }}</template>
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

    <el-dialog v-model="formVisible" title="授予荣誉" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="学生" prop="studentId">
          <el-select
            v-model="form.studentId"
            filterable
            remote
            :remote-method="searchStudent"
            placeholder="输入学号或姓名搜索"
            style="width: 100%"
          >
            <el-option v-for="s in studentOptions" :key="s.id" :label="`${s.studentNo} - ${s.name}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="荣誉名称" prop="name">
          <el-input v-model="form.name" placeholder="如：三好学生、优秀班干部" />
        </el-form-item>
        <el-form-item label="学期" prop="semester">
          <el-input v-model="form.semester" placeholder="如 2025-2026-1" />
        </el-form-item>
        <el-form-item label="评审结果">
          <el-input v-model="form.result" placeholder="如：经评审授予（选填）" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">授予</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, type FormInstance } from 'element-plus';
import { Plus, Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listHonors, grantHonor, type HonorResult } from '@/api/affairs';
import { listStudents } from '@/api/status';

const loading = ref(false);
const submitting = ref(false);
const list = ref<HonorResult[]>([]);
const formVisible = ref(false);
const formRef = ref<FormInstance>();
const studentOptions = ref<{ id: string; studentNo: string; name: string }[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  studentName: '',
  semester: '',
});

const form = reactive({
  studentId: '',
  name: '',
  semester: '',
  result: '',
});

const rules = {
  studentId: [{ required: true, message: '请选择学生', trigger: 'change' }],
  name: [{ required: true, message: '请输入荣誉名称', trigger: 'blur' }],
  semester: [{ required: true, message: '请输入学期', trigger: 'blur' }],
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listHonors({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      semester: query.semester || undefined,
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
  query.semester = '';
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

function onGrant(): void {
  form.studentId = '';
  form.name = '';
  form.semester = '';
  form.result = '';
  studentOptions.value = [];
  formVisible.value = true;
}

async function onSubmit(): Promise<void> {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    await grantHonor({ ...form });
    ElMessage.success('荣誉授予成功');
    formVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.honor-page {
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
