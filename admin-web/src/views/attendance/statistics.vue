<template>
  <div class="statistics-page">
    <PageHeader title="考勤统计" subtitle="按班级聚合出勤率、缺勤分布" />

    <el-card>
      <div class="search-bar">
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" @change="onDateChange" />
        <el-button type="primary" :icon="Search" @click="loadData">查询</el-button>
      </div>

      <div v-loading="loading">
        <el-row :gutter="16" v-if="data">
          <el-col :span="4">
            <el-statistic title="总记录" :value="data.summary.total" />
          </el-col>
          <el-col :span="5">
            <el-statistic title="出勤" :value="data.summary.present" :value-style="{ color: '#67c23a' }" />
          </el-col>
          <el-col :span="5">
            <el-statistic title="缺勤" :value="data.summary.absent" :value-style="{ color: '#f56c6c' }" />
          </el-col>
          <el-col :span="5">
            <el-statistic title="迟到" :value="data.summary.late" :value-style="{ color: '#e6a23c' }" />
          </el-col>
          <el-col :span="5">
            <el-statistic title="请假" :value="data.summary.leave" :value-style="{ color: '#909399' }" />
          </el-col>
        </el-row>

        <div ref="pieRef" class="chart-box" />
        <div ref="barRef" class="chart-box" />

        <el-table v-if="data" :data="data.byClass" border style="margin-top: 16px">
          <el-table-column label="班级" prop="className" min-width="140" />
          <el-table-column label="总记录" prop="total" width="100" align="center" />
          <el-table-column label="出勤" prop="present" width="100" align="center" />
          <el-table-column label="缺勤" prop="absent" width="100" align="center" />
          <el-table-column label="迟到" prop="late" width="100" align="center" />
          <el-table-column label="请假" prop="leave" width="100" align="center" />
          <el-table-column label="出勤率" width="200">
            <template #default="{ row }">
              <el-progress :percentage="row.rate" :color="rateColor(row.rate)" />
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
import { Search } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { eduChartColors } from '@shared-web/utils/echarts-theme';
import { getAttendanceStatistics, type AttendanceStatisticsResult } from '@/api/attendance';

const loading = ref(false);
const data = ref<AttendanceStatisticsResult | null>(null);
const dateRange = ref<[string, string] | null>(null);
const startDate = ref('');
const endDate = ref('');

const pieRef = ref<HTMLElement>();
const barRef = ref<HTMLElement>();
let pieChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;

const rateColor = (rate: number): string => {
  if (rate >= 90) return '#67c23a';
  if (rate >= 70) return '#e6a23c';
  return '#f56c6c';
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    data.value = await getAttendanceStatistics({
      startDate: startDate.value || undefined,
      endDate: endDate.value || undefined,
    });
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

  // 饼图：总体考勤分布
  if (pieRef.value) {
    if (!pieChart) pieChart = echarts.init(pieRef.value, 'edu');
    pieChart.setOption({
      title: { text: '考勤状态分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { name: '出勤', value: data.value.summary.present, itemStyle: { color: eduChartColors.success } },
          { name: '缺勤', value: data.value.summary.absent, itemStyle: { color: eduChartColors.danger } },
          { name: '迟到', value: data.value.summary.late, itemStyle: { color: eduChartColors.warning } },
          { name: '请假', value: data.value.summary.leave, itemStyle: { color: eduChartColors.gray } },
        ],
      }],
    });
  }

  // 柱状图：各班出勤率
  if (barRef.value) {
    if (!barChart) barChart = echarts.init(barRef.value, 'edu');
    const classes = data.value.byClass.map((c) => c.className);
    const rates = data.value.byClass.map((c) => c.rate);
    barChart.setOption({
      title: { text: '各班出勤率', left: 'center' },
      tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
      xAxis: { type: 'category', data: classes, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: rates,
        label: { show: true, position: 'top', formatter: '{c}%' },
      }],
    });
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
.statistics-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.chart-box {
  width: 100%;
  height: 320px;
  margin-top: 20px;
}
</style>
