<template>
  <div class="certificate-page">
    <PageHeader title="证明申请" subtitle="处理学生的在校/学籍证明申请，可生成 PDF" />

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 160px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-select v-model="query.type" placeholder="证明类型" clearable style="width: 140px" @change="onSearch">
          <el-option label="在校证明" value="ENROLLMENT" />
          <el-option label="学籍证明" value="STATUS" />
        </el-select>
        <el-select v-model="query.status" placeholder="状态" clearable style="width: 140px" @change="onSearch">
          <el-option label="待处理" value="PENDING" />
          <el-option label="已生成" value="APPROVED" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column prop="student.studentNo" label="学号" width="120" />
        <el-table-column prop="student.name" label="姓名" width="100" />
        <el-table-column label="院系/班级" min-width="180">
          <template #default="{ row }">
            {{ row.student?.department?.name || '—' }} / {{ row.student?.class?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="证明类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'ENROLLMENT' ? 'success' : 'info'">
              {{ row.type === 'ENROLLMENT' ? '在校证明' : '学籍证明' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用途" min-width="180" show-overflow-tooltip prop="purpose" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'APPROVED' ? 'success' : 'warning'">
              {{ row.status === 'APPROVED' ? '已生成' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="申请时间" width="160">
          <template #default="{ row }">{{ row.createdAt?.replace('T', ' ').slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="onGenerate(row)">生成PDF</el-button>
            <el-button v-if="row.fileUrl" type="success" link @click="onDownload(row)">下载</el-button>
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
  listCertificates,
  generateCertificatePdf,
  type CertificateListResult,
} from '@/api/status';
import { ApplyStatus } from '@shared-web/types';

const loading = ref(false);
const list = ref<CertificateListResult[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  studentName: '',
  type: undefined as string | undefined,
  status: undefined as ApplyStatus | undefined,
});

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listCertificates({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      type: query.type as any,
      status: query.status,
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
  query.status = undefined;
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

async function onGenerate(row: CertificateListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认为「${row.student?.name}」生成${row.type === 'ENROLLMENT' ? '在校证明' : '学籍证明'} PDF？`, '生成确认', { type: 'info' });
    await generateCertificatePdf(row.id);
    ElMessage.success('PDF 已生成');
    await loadData();
  } catch { /* cancel */ }
}

function onDownload(row: CertificateListResult): void {
  if (row.fileUrl) {
    window.open(row.fileUrl, '_blank');
  }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.certificate-page {
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
