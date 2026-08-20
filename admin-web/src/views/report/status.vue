<template>
  <div class="report-page">
    <PageHeader title="学籍异动统计" subtitle="按月趋势 / 异动类型聚合">
      <template #extra>
        <el-button :icon="Download" @click="onExport('excel')" :loading="exporting">导出 Excel</el-button>
        <el-button :icon="Download" @click="onExport('pdf')" :loading="exporting">导出 PDF</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <span class="search-label">时间范围：</span>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 280px" @change="onDateChange" />
        <el-button type="primary" :icon="Search" @click="loadData">查询</el-button>
      </div>

      <div v-loading="loading">
        <el-row :gutter="16" v-if="data">
          <el-col :span="8">
            <el-statistic title="异动总数" :value="data.total" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="异动类型数" :value="data.byType.length" :value-style="{ color: '#67c23a' }" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="覆盖月份" :value="data.byMonth.length" :value-style="{ color: '#409eff' }" />
          </el-col>
        </el-row>

        <div ref="lineRef" class="chart-box" />
        <div ref="pieRef" class="chart-box" />

        <el-table v-if="data" :data="data.byMonth" border style="margin-top: 16px">
          <el-table-column label="月份" prop="month" width="160" />
          <el-table-column label="异动人数" prop="count" width="160" align="right" sortable />
          <el-table-column label="占比" width="300">
            <template #default="{ row }">
              <el-progress :percentage="data.total === 0 ? 0 : Math.round((row.count / data.total) * 100)" />
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import { Search, Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { getStatusChangeReport, exportReport, type StatusChangeReport } from '@/api/report';

const loading = ref(false);
const exporting = ref(false);
const data = ref<StatusChangeReport | null>(null);
const dateRange = ref<[string, string] | null>(null);
const startDate = ref('');
const endDate = ref('');

const lineRef = ref<HTMLElement>();
const pieRef = ref<HTMLElement>();
let lineChart: echarts.ECharts | null = null;
let pieChart: echarts.ECharts | null = null;

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    data.value = await getStatusChangeReport(startDate.value || undefined, endDate.value || undefined);
    await nextTick();
    renderCharts();
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

function onDateChange(val: [string, string] | null): void {
  if (val) {
    startDate.value = val[0];
    endDate.value = val[1];
  } else {
    startDate.value = '';
    endDate.value = '';
  }
}

function renderCharts(): void {
  if (!data.value) return;

  if (lineRef.value) {
    if (!lineChart) lineChart = echarts.init(lineRef.value, 'edu');
    lineChart.setOption({
      title: { text: '学籍异动按月趋势', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.value.byMonth.map((m) => m.month), boundaryGap: false },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'line',
        data: data.value.byMonth.map((m) => m.count),
        areaStyle: { opacity: 0.2 },
        label: { show: true, position: 'top' },
      }],
    });
  }

  if (pieRef.value) {
    if (!pieChart) pieChart = echarts.init(pieRef.value, 'edu');
    pieChart.setOption({
      title: { text: '异动类型分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: data.value.byType.map((t) => ({ name: t.name, value: t.value })),
      }],
    });
  }
}

async function onExport(format: 'excel' | 'pdf'): Promise<void> {
  exporting.value = true;
  try {
    await exportReport('status', format, { startDate: startDate.value || undefined, endDate: endDate.value || undefined });
    ElMessage.success('导出成功');
  } catch { /* ignore */ } finally {
    exporting.value = false;
  }
}

function onResize(): void {
  lineChart?.resize();
  pieChart?.resize();
}

onMounted(() => {
  loadData();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  lineChart?.dispose();
  pieChart?.dispose();
});
</script>

<style scoped lang="scss">
.report-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  .search-label { color: #606266; font-size: 14px; }
}
.chart-box {
  width: 100%;
  height: 320px;
  margin-top: 20px;
}
</style>
