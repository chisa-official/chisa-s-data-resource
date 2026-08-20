<template>
  <div class="report-page">
    <PageHeader title="违纪统计" subtitle="按违纪类型 / 院系聚合">
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
            <el-statistic title="违纪总数" :value="data.total" :value-style="{ color: '#f56c6c' }" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="违纪类型数" :value="data.byType.length" :value-style="{ color: '#e6a23c' }" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="涉及院系" :value="data.byDepartment.length" :value-style="{ color: '#909399' }" />
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="10">
            <div ref="pieRef" class="chart-box" />
          </el-col>
          <el-col :xs="24" :md="14">
            <div ref="barRef" class="chart-box" />
          </el-col>
        </el-row>

        <el-table v-if="data" :data="data.byDepartment" border style="margin-top: 16px">
          <el-table-column label="院系" prop="departmentName" min-width="180" />
          <el-table-column label="违纪人数" prop="count" width="140" align="right" sortable />
          <el-table-column label="占比" width="260">
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
import { getDisciplineReport, exportReport, type DisciplineReport } from '@/api/report';

const loading = ref(false);
const exporting = ref(false);
const data = ref<DisciplineReport | null>(null);
const dateRange = ref<[string, string] | null>(null);
const startDate = ref('');
const endDate = ref('');

const pieRef = ref<HTMLElement>();
const barRef = ref<HTMLElement>();
let pieChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    data.value = await getDisciplineReport(startDate.value || undefined, endDate.value || undefined);
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

  if (pieRef.value) {
    if (!pieChart) pieChart = echarts.init(pieRef.value, 'edu');
    pieChart.setOption({
      title: { text: '违纪类型分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: data.value.byType.map((t) => ({ name: t.name, value: t.value })),
      }],
    });
  }

  if (barRef.value) {
    if (!barChart) barChart = echarts.init(barRef.value, 'edu');
    barChart.setOption({
      title: { text: '各院系违纪人数', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.value.byDepartment.map((d) => d.departmentName), axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [{
        type: 'bar',
        data: data.value.byDepartment.map((d) => d.count),
        label: { show: true, position: 'top' },
      }],
    });
  }
}

async function onExport(format: 'excel' | 'pdf'): Promise<void> {
  exporting.value = true;
  try {
    await exportReport('discipline', format, { startDate: startDate.value || undefined, endDate: endDate.value || undefined });
    ElMessage.success('导出成功');
  } catch { /* ignore */ } finally {
    exporting.value = false;
  }
}

function onResize(): void {
  pieChart?.resize();
  barChart?.resize();
}

onMounted(() => {
  loadData();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  pieChart?.dispose();
  barChart?.dispose();
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
