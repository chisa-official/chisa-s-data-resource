<template>
  <div class="graduation-page">
    <PageHeader title="毕业审核" subtitle="根据学分/绩点审核毕业资格，批量登记毕业状态" />

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 160px" @keyup.enter="onSearch" />
        <el-input v-model="query.name" placeholder="姓名" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-select v-model="query.departmentId" placeholder="院系" clearable filterable style="width: 200px" @change="onSearch">
          <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
        <div class="search-bar__right">
          <el-button
            type="success"
            :disabled="selectedIds.length === 0"
            @click="onBatchRegister('GRADUATED')"
          >批量毕业登记</el-button>
        </div>
      </div>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 12px;"
      >
        <template #title>
          毕业资格判定：修满应修学分（学制 × 30）且在校年限 ≥ 学制年限。<br />
          登记类型：毕业（GRADUATED）、结业（COMPLETED）、肄业（LEFT）
        </template>
      </el-alert>

      <el-table
        v-loading="loading"
        :data="list"
        border
        row-key="id"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="studentNo" label="学号" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="departmentName" label="院系" min-width="140" />
        <el-table-column prop="className" label="班级" min-width="140" />
        <el-table-column prop="majorName" label="专业" min-width="140" />
        <el-table-column label="学制" width="70" align="center" prop="expectedDuration" />
        <el-table-column label="在校年限" width="90" align="center" prop="yearsStudied" />
        <el-table-column label="已修学分" width="90" align="center" prop="totalCredits" />
        <el-table-column label="必修学分" width="90" align="center" prop="requiredCredits" />
        <el-table-column label="应修学分" width="90" align="center" prop="requiredTotalCredits" />
        <el-table-column label="绩点" width="70" align="center" prop="gpa" />
        <el-table-column label="资格" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.qualified ? 'success' : 'danger'">
              {{ row.qualified ? '符合' : '不符合' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button type="success" link @click="onRegister(row.id, 'GRADUATED')">毕业</el-button>
            <el-button type="warning" link @click="onRegister(row.id, 'COMPLETED')">结业</el-button>
            <el-button type="danger" link @click="onRegister(row.id, 'LEFT')">肄业</el-button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import {
  graduationAuditList,
  registerGraduation,
  batchRegisterGraduation,
  type GraduationAuditResult,
} from '@/api/status';
import { getDepartmentList } from '@/api/base';
import type { Department } from '@shared-web/types';

const loading = ref(false);
const list = ref<GraduationAuditResult[]>([]);
const departments = ref<Department[]>([]);
const selectedIds = ref<string[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  name: '',
  departmentId: undefined as string | undefined,
});

async function loadDepartments(): Promise<void> {
  try {
    departments.value = await getDepartmentList();
  } catch { /* ignore */ }
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await graduationAuditList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      name: query.name || undefined,
      departmentId: query.departmentId,
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
  query.name = '';
  query.departmentId = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

function onSelectionChange(rows: GraduationAuditResult[]): void {
  selectedIds.value = rows.map((r) => r.id);
}

const resultText = (r: string): string => ({ GRADUATED: '毕业', COMPLETED: '结业', LEFT: '肄业' } as any)[r];

async function onRegister(id: string, result: 'GRADUATED' | 'COMPLETED' | 'LEFT'): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认登记该学生为「${resultText(result)}」状态？`, '登记确认', { type: 'warning' });
    await registerGraduation(id, result);
    ElMessage.success('登记成功');
    await loadData();
  } catch { /* cancel */ }
}

async function onBatchRegister(result: 'GRADUATED' | 'COMPLETED' | 'LEFT'): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认将选中的 ${selectedIds.value.length} 名学生批量登记为「${resultText(result)}」？`, '批量登记', { type: 'warning' });
    const res = await batchRegisterGraduation(selectedIds.value, result);
    ElMessage.success(`已登记 ${res.count} 名学生`);
    await loadData();
  } catch { /* cancel */ }
}

onMounted(() => {
  loadDepartments();
  loadData();
});
</script>

<style scoped lang="scss">
.graduation-page {
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
  &__right {
    margin-left: auto;
  }
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
