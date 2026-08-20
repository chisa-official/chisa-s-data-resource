<template>
  <div class="assign-page">
    <PageHeader title="入住分配管理" subtitle="学生入住分配、调宿、退宿办理">
      <template #extra>
        <el-button type="primary" :icon="Plus" @click="onAssign">分配入住</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.building" placeholder="楼栋" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 120px" @keyup.enter="onSearch" />
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 120px" @change="onSearch">
          <el-option label="在住" value="ACTIVE" />
          <el-option label="已退宿" value="MOVED_OUT" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column label="学号" width="120">
          <template #default="{ row }">{{ row.student?.studentNo }}</template>
        </el-table-column>
        <el-table-column label="姓名" width="100">
          <template #default="{ row }">{{ row.student?.name }}</template>
        </el-table-column>
        <el-table-column label="院系/班级" min-width="160">
          <template #default="{ row }">
            {{ row.student?.department?.name || '—' }} / {{ row.student?.class?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="宿舍" width="140">
          <template #default="{ row }">{{ row.dorm?.building }} - {{ row.dorm?.roomNo }}</template>
        </el-table-column>
        <el-table-column prop="bedNo" label="床位" width="80" align="center" />
        <el-table-column label="入住日期" width="120">
          <template #default="{ row }">{{ row.moveInDate?.slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column label="退宿日期" width="120">
          <template #default="{ row }">{{ row.moveOutDate ? row.moveOutDate.slice(0, 10) : '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">{{ row.status === 'ACTIVE' ? '在住' : '已退宿' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'ACTIVE'">
              <el-button type="warning" link @click="onTransfer(row)">调宿</el-button>
              <el-button type="danger" link @click="onCheckout(row)">退宿</el-button>
            </template>
            <span v-else class="text-muted">—</span>
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

    <!-- 分配入住弹窗 -->
    <el-dialog v-model="assignVisible" title="分配入住" width="480px">
      <el-form ref="assignFormRef" :model="assignForm" :rules="assignRules" label-width="90px">
        <el-form-item label="学生" prop="studentId">
          <el-select
            v-model="assignForm.studentId"
            filterable
            remote
            :remote-method="searchStudent"
            placeholder="输入学号或姓名搜索"
            style="width: 100%"
          >
            <el-option v-for="s in studentOptions" :key="s.id" :label="`${s.studentNo} - ${s.name}`" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="宿舍" prop="dormId">
          <el-select v-model="assignForm.dormId" filterable placeholder="选择宿舍" style="width: 100%" @change="onDormChange">
            <el-option v-for="d in dormOptions" :key="d.id" :label="`${d.building} - ${d.roomNo}（${d.gender === 'MALE' ? '男' : '女'}）`" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="床位" prop="bedNo">
          <el-select v-model="assignForm.bedNo" placeholder="选择床位" style="width: 100%">
            <el-option v-for="b in availableBeds" :key="b.bedNo" :label="`${b.bedNo} 号床${b.occupied ? '（已占）' : ''}`" :value="b.bedNo" :disabled="b.occupied" />
          </el-select>
        </el-form-item>
        <el-form-item label="入住日期">
          <el-date-picker v-model="assignForm.moveInDate" type="date" placeholder="选择入住日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitAssign">确定分配</el-button>
      </template>
    </el-dialog>

    <!-- 调宿弹窗 -->
    <el-dialog v-model="transferVisible" title="调宿办理" width="480px">
      <el-form ref="transferFormRef" :model="transferForm" :rules="transferRules" label-width="90px">
        <el-form-item label="目标宿舍" prop="dormId">
          <el-select v-model="transferForm.dormId" filterable placeholder="选择目标宿舍" style="width: 100%" @change="onTransferDormChange">
            <el-option v-for="d in dormOptions" :key="d.id" :label="`${d.building} - ${d.roomNo}（${d.gender === 'MALE' ? '男' : '女'}）`" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="目标床位" prop="bedNo">
          <el-select v-model="transferForm.bedNo" placeholder="选择床位" style="width: 100%">
            <el-option v-for="b in transferBeds" :key="b.bedNo" :label="`${b.bedNo} 号床${b.occupied ? '（已占）' : ''}`" :value="b.bedNo" :disabled="b.occupied" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitTransfer">确定调宿</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { Plus, Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  listAssignments,
  assignDorm,
  transferDorm,
  checkoutDorm,
  listDorms,
  getDormBeds,
  type AssignmentResult,
  type DormListResult,
  type DormBed,
} from '@/api/dorm';
import { listStudents } from '@/api/status';
import { AssignStatus } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<AssignmentResult[]>([]);
const dormOptions = ref<DormListResult[]>([]);
const studentOptions = ref<{ id: string; studentNo: string; name: string }[]>([]);

const assignVisible = ref(false);
const assignFormRef = ref<FormInstance>();
const availableBeds = ref<DormBed[]>([]);

const transferVisible = ref(false);
const transferFormRef = ref<FormInstance>();
const transferBeds = ref<DormBed[]>([]);
const transferStudentId = ref('');

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  building: '',
  studentNo: '',
  studentName: '',
  status: undefined as AssignStatus | undefined,
});

const assignForm = reactive({
  studentId: '',
  dormId: '',
  bedNo: '',
  moveInDate: '',
});

const transferForm = reactive({
  dormId: '',
  bedNo: '',
});

const assignRules = {
  studentId: [{ required: true, message: '请选择学生', trigger: 'change' }],
  dormId: [{ required: true, message: '请选择宿舍', trigger: 'change' }],
  bedNo: [{ required: true, message: '请选择床位', trigger: 'change' }],
};

const transferRules = {
  dormId: [{ required: true, message: '请选择目标宿舍', trigger: 'change' }],
  bedNo: [{ required: true, message: '请选择目标床位', trigger: 'change' }],
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listAssignments({
      page: pagination.page,
      pageSize: pagination.pageSize,
      building: query.building || undefined,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      status: query.status,
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
  query.status = undefined;
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

async function onDormChange(dormId: string): Promise<void> {
  assignForm.bedNo = '';
  availableBeds.value = [];
  if (!dormId) return;
  try {
    const res = await getDormBeds(dormId);
    availableBeds.value = res.beds;
  } catch { /* ignore */ }
}

async function onTransferDormChange(dormId: string): Promise<void> {
  transferForm.bedNo = '';
  transferBeds.value = [];
  if (!dormId) return;
  try {
    const res = await getDormBeds(dormId);
    transferBeds.value = res.beds;
  } catch { /* ignore */ }
}

function onAssign(): void {
  assignForm.studentId = '';
  assignForm.dormId = '';
  assignForm.bedNo = '';
  assignForm.moveInDate = '';
  studentOptions.value = [];
  availableBeds.value = [];
  assignVisible.value = true;
}

async function onSubmitAssign(): Promise<void> {
  await assignFormRef.value?.validate();
  submitting.value = true;
  try {
    await assignDorm({
      studentId: assignForm.studentId,
      dormId: assignForm.dormId,
      bedNo: assignForm.bedNo,
      moveInDate: assignForm.moveInDate || undefined,
    });
    ElMessage.success('入住分配成功');
    assignVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

function onTransfer(row: AssignmentResult): void {
  transferStudentId.value = row.studentId;
  transferForm.dormId = '';
  transferForm.bedNo = '';
  transferBeds.value = [];
  transferVisible.value = true;
}

async function onSubmitTransfer(): Promise<void> {
  await transferFormRef.value?.validate();
  submitting.value = true;
  try {
    await transferDorm({
      studentId: transferStudentId.value,
      dormId: transferForm.dormId,
      bedNo: transferForm.bedNo,
    });
    ElMessage.success('调宿办理成功');
    transferVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

async function onCheckout(row: AssignmentResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认办理「${row.student?.name}」的退宿？`, '退宿确认', { type: 'warning' });
    await checkoutDorm({ studentId: row.studentId });
    ElMessage.success('退宿办理成功');
    await loadData();
  } catch { /* cancel */ }
}

onMounted(() => {
  loadData();
  loadDorms();
});
</script>

<style scoped lang="scss">
.assign-page {
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
