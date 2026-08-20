<template>
  <div class="publish-page">
    <PageHeader title="名单公示发布" subtitle="将已通过的奖助申请发布公示">
      <template #extra>
        <el-button
          type="success"
          :icon="Promotion"
          :disabled="selectedIds.length === 0"
          @click="onBatchPublish"
        >批量公示（{{ selectedIds.length }}）</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 140px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-select v-model="query.type" placeholder="项目类型" clearable style="width: 130px" @change="onSearch">
          <el-option label="奖学金" value="SCHOLARSHIP" />
          <el-option label="助学金" value="AID" />
          <el-option label="助学贷款" value="LOAN" />
          <el-option label="评优" value="HONOR" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="list"
        border
        row-key="id"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="44" :selectable="(row: AwardApplyResult) => !isPublished(row)" />
        <el-table-column prop="student.studentNo" label="学号" width="120" />
        <el-table-column prop="student.name" label="姓名" width="100" />
        <el-table-column label="项目名称" prop="name" min-width="160" />
        <el-table-column label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)" size="small">{{ typeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="100" align="right">
          <template #default="{ row }">{{ row.amount != null ? '¥' + row.amount : '—' }}</template>
        </el-table-column>
        <el-table-column label="学期" prop="semester" width="120" />
        <el-table-column label="公示状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="isPublished(row) ? 'success' : 'info'" size="small">
              {{ isPublished(row) ? '已公示' : '未公示' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="!isPublished(row)"
              type="success"
              link
              :icon="Promotion"
              @click="onPublish(row)"
            >公示</el-button>
            <span v-else class="sub-text">已公示</span>
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
import { Search, Refresh, Promotion } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listAwardApplies, publishAward, batchPublishAward, type AwardApplyResult } from '@/api/affairs';
import { ApplyStatus, AwardType } from '@shared-web/types';

const loading = ref(false);
const list = ref<AwardApplyResult[]>([]);
const selectedIds = ref<string[]>([]);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  studentNo: '',
  studentName: '',
  type: undefined as AwardType | undefined,
});

const typeText = (t: AwardType): string => ({ SCHOLARSHIP: '奖学金', AID: '助学金', LOAN: '助学贷款', HONOR: '评优' } as any)[t];
const typeTagType = (t: AwardType): 'success' | 'warning' | 'info' | 'danger' => {
  if (t === 'SCHOLARSHIP') return 'success';
  if (t === 'AID') return 'warning';
  if (t === 'LOAN') return 'info';
  return 'danger';
};
const isPublished = (row: AwardApplyResult): boolean => !!row.result?.includes('已公示');

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listAwardApplies({
      page: pagination.page,
      pageSize: pagination.pageSize,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
      type: query.type,
      status: ApplyStatus.APPROVED,
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

function onSelectionChange(rows: AwardApplyResult[]): void {
  selectedIds.value = rows.map((r) => r.id);
}

async function onPublish(row: AwardApplyResult): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认公示「${row.student?.name}」的「${row.name}」申请？`, '公示确认', { type: 'info' });
    await publishAward(row.id);
    ElMessage.success('已公示');
    await loadData();
  } catch { /* cancel */ }
}

async function onBatchPublish(): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认批量公示选中的 ${selectedIds.value.length} 条记录？`, '批量公示', { type: 'warning' });
    const res = await batchPublishAward(selectedIds.value);
    ElMessage.success(`已公示 ${res.count} 条`);
    await loadData();
  } catch { /* cancel */ }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.publish-page {
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
.sub-text {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
