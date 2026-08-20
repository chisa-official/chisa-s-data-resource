<template>
  <div class="selection-page">
    <PageHeader title="选课管理" subtitle="选课时间段设置 + 选课情况查询 + 选课统计" />

    <el-tabs v-model="activeTab" class="selection-tabs">
      <!-- 选课记录 -->
      <el-tab-pane label="选课记录" name="records">
        <el-card>
          <div class="search-bar">
            <el-select v-model="recordQuery.courseId" placeholder="课程" clearable filterable style="width: 220px" @change="onSearchRecords">
              <el-option v-for="c in courses" :key="c.id" :label="`${c.code} ${c.name}`" :value="c.id" />
            </el-select>
            <el-input v-model="recordQuery.semester" placeholder="学期" clearable style="width: 160px" @keyup.enter="onSearchRecords" />
            <el-input v-model="recordQuery.studentNo" placeholder="学号" clearable style="width: 130px" @keyup.enter="onSearchRecords" />
            <el-input v-model="recordQuery.studentName" placeholder="姓名" clearable style="width: 120px" @keyup.enter="onSearchRecords" />
            <el-select v-model="recordQuery.status" placeholder="状态" clearable style="width: 120px" @change="onSearchRecords">
              <el-option label="已选" value="SELECTED" />
              <el-option label="已退" value="DROPPED" />
              <el-option label="已完成" value="COMPLETED" />
            </el-select>
            <el-button type="primary" :icon="Search" @click="onSearchRecords">查询</el-button>
            <el-button :icon="Refresh" @click="onResetRecords">重置</el-button>
          </div>

          <el-table v-loading="recordLoading" :data="records" border>
            <el-table-column label="学号" width="120">
              <template #default="{ row }">{{ row.student?.studentNo || '—' }}</template>
            </el-table-column>
            <el-table-column label="姓名" width="100">
              <template #default="{ row }">{{ row.student?.name || '—' }}</template>
            </el-table-column>
            <el-table-column label="班级" min-width="120">
              <template #default="{ row }">{{ row.student?.class?.name || '—' }}</template>
            </el-table-column>
            <el-table-column label="课程" min-width="160">
              <template #default="{ row }">
                <div>{{ row.course?.name || '—' }}</div>
                <div class="sub-text">{{ row.course?.code }} · {{ row.course?.teacher?.name || '—' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="学期" prop="semester" width="130" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="选课时间" width="160">
              <template #default="{ row }">{{ row.createdAt ? row.createdAt.slice(0, 16).replace('T', ' ') : '—' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'SELECTED'"
                  type="danger"
                  link
                  @click="onForceDrop(row)"
                >强制退选</el-button>
                <span v-else class="sub-text">—</span>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="recordPagination.page"
              v-model:page-size="recordPagination.pageSize"
              :total="recordPagination.total"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @current-change="loadRecords"
              @size-change="onRecordSizeChange"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 选课统计 -->
      <el-tab-pane label="选课统计" name="statistics">
        <el-card>
          <div class="search-bar">
            <el-input v-model="statQuery.semester" placeholder="学期（如 2025-2026-1）" clearable style="width: 220px" @keyup.enter="loadStatistics" />
            <el-button type="primary" :icon="Search" @click="loadStatistics">查询</el-button>
            <el-button :icon="Refresh" @click="onResetStat">重置</el-button>
          </div>

          <div ref="chartRef" class="chart-box" />
          <el-divider />

          <el-table v-loading="statLoading" :data="statistics" border>
            <el-table-column label="课程编码" prop="code" width="130" />
            <el-table-column label="课程名称" prop="name" min-width="160" />
            <el-table-column label="类型" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="typeTag(row.type)" size="small">{{ typeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="授课教师" min-width="110">
              <template #default="{ row }">{{ row.teacherName || '—' }}</template>
            </el-table-column>
            <el-table-column label="容量" prop="capacity" width="80" align="center" />
            <el-table-column label="已选" prop="selectedCount" width="80" align="center" />
            <el-table-column label="剩余" width="80" align="center">
              <template #default="{ row }">{{ row.capacity - row.selectedCount }}</template>
            </el-table-column>
            <el-table-column label="填报率" width="220">
              <template #default="{ row }">
                <el-progress :percentage="row.fillRate" :color="fillColor(row.fillRate)" />
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, nextTick, onUnmounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import * as echarts from 'echarts';
import { eduChartColors } from '@shared-web/utils/echarts-theme';
import {
  listSelections,
  selectionStatistics,
  forceDropSelection,
  type SelectionListResult,
  type SelectionStatisticsResult,
} from '@/api/academic';
import { listCourses, type CourseListResult } from '@/api/base';

const activeTab = ref<'records' | 'statistics'>('records');
const courses = ref<CourseListResult[]>([]);

// 选课记录
const recordLoading = ref(false);
const records = ref<SelectionListResult[]>([]);
const recordPagination = reactive({ page: 1, pageSize: 10, total: 0 });
const recordQuery = reactive({
  courseId: undefined as string | undefined,
  semester: '',
  studentNo: '',
  studentName: '',
  status: undefined as string | undefined,
});

// 统计
const statLoading = ref(false);
const statistics = ref<SelectionStatisticsResult[]>([]);
const statQuery = reactive({ semester: '' });
const chartRef = ref<HTMLElement>();
let chartInstance: echarts.ECharts | null = null;

function typeLabel(type: string): string {
  const map: Record<string, string> = { REQUIRED: '必修', ELECTIVE: '选修', PUBLIC: '公共' };
  return map[type] || type;
}

function typeTag(type: string): 'primary' | 'success' | 'warning' {
  const map: Record<string, 'primary' | 'success' | 'warning'> = {
    REQUIRED: 'primary',
    ELECTIVE: 'success',
    PUBLIC: 'warning',
  };
  return map[type] || ('info' as any);
}

function statusLabel(s: string): string {
  const map: Record<string, string> = { SELECTED: '已选', DROPPED: '已退', COMPLETED: '已完成' };
  return map[s] || s;
}

function statusTagType(s: string): 'success' | 'info' | 'warning' {
  const map: Record<string, 'success' | 'info' | 'warning'> = {
    SELECTED: 'success',
    DROPPED: 'info',
    COMPLETED: 'warning',
  };
  return map[s] || ('info' as any);
}

function fillColor(rate: number): string {
  if (rate >= 90) return eduChartColors.danger;
  if (rate >= 60) return eduChartColors.warning;
  return eduChartColors.success;
}

async function loadCourses(): Promise<void> {
  try {
    const res = await listCourses({ page: 1, pageSize: 1000 });
    courses.value = res.list;
  } catch { /* ignore */ }
}

async function loadRecords(): Promise<void> {
  recordLoading.value = true;
  try {
    const res = await listSelections({
      page: recordPagination.page,
      pageSize: recordPagination.pageSize,
      courseId: recordQuery.courseId,
      semester: recordQuery.semester || undefined,
      studentNo: recordQuery.studentNo || undefined,
      studentName: recordQuery.studentName || undefined,
      status: recordQuery.status as any,
    });
    records.value = res.list;
    recordPagination.total = res.total;
  } catch { /* ignore */ } finally {
    recordLoading.value = false;
  }
}

function onSearchRecords(): void {
  recordPagination.page = 1;
  loadRecords();
}

function onResetRecords(): void {
  recordQuery.courseId = undefined;
  recordQuery.semester = '';
  recordQuery.studentNo = '';
  recordQuery.studentName = '';
  recordQuery.status = undefined;
  recordPagination.page = 1;
  loadRecords();
}

function onRecordSizeChange(size: number): void {
  recordPagination.pageSize = size;
  recordPagination.page = 1;
  loadRecords();
}

async function onForceDrop(row: SelectionListResult): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认强制退选「${row.student?.name}」的「${row.course?.name}」？`,
      '强制退选',
      { type: 'warning' },
    );
    await forceDropSelection(row.id);
    ElMessage.success('已强制退选');
    await loadRecords();
  } catch { /* cancel */ }
}

async function loadStatistics(): Promise<void> {
  statLoading.value = true;
  try {
    statistics.value = await selectionStatistics(statQuery.semester || undefined);
    await nextTick();
    renderChart();
  } catch { /* ignore */ } finally {
    statLoading.value = false;
  }
}

function onResetStat(): void {
  statQuery.semester = '';
  loadStatistics();
}

function renderChart(): void {
  if (!chartRef.value) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value, 'edu');
  }
  const data = statistics.value.slice(0, 15);
  chartInstance.setOption({
    title: { text: '选课填报率 Top 15', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '8%', containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%' },
    },
    yAxis: {
      type: 'category',
      data: data.map((d) => d.name).reverse(),
      axisLabel: { interval: 0, fontSize: 11 },
    },
    series: [
      {
        name: '填报率',
        type: 'bar',
        data: data.map((d) => d.fillRate).reverse(),
        itemStyle: {
          color: (params: any) => fillColor(params.value),
        },
        label: { show: true, position: 'right', formatter: '{c}%' },
      },
    ],
  });
  chartInstance.resize();
}

watch(activeTab, (tab) => {
  if (tab === 'statistics') {
    if (statistics.value.length === 0) {
      loadStatistics();
    } else {
      nextTick(() => renderChart());
    }
  }
});

function onResize(): void {
  chartInstance?.resize();
}

onMounted(() => {
  loadCourses();
  loadRecords();
  window.addEventListener('resize', onResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onResize);
  chartInstance?.dispose();
  chartInstance = null;
});
</script>

<style scoped lang="scss">
.selection-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.selection-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 12px;
  }
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
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.chart-box {
  width: 100%;
  height: 360px;
}
</style>
