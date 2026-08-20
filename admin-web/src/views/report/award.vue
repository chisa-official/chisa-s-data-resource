<template>
  <div class="report-page">
    <PageHeader title="奖助学金统计" subtitle="按类型 / 院系聚合（奖学金/助学金/助学贷款/评优）">
      <template #extra>
        <el-button :icon="Download" @click="onExport('excel')" :loading="exporting">导出 Excel</el-button>
        <el-button :icon="Download" @click="onExport('pdf')" :loading="exporting">导出 PDF</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <span class="search-label">学期：</span>
        <el-input v-model="semester" placeholder="如 2025-2026-1，留空查全部" clearable style="width: 220px" @keyup.enter="loadData" />
        <el-button type="primary" :icon="Search" @click="loadData">查询</el-button>
      </div>

      <div v-loading="loading">
        <el-row :gutter="16" v-if="data">
          <el-col :span="8">
            <el-statistic title="总人次" :value="data.totalCount" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="总金额（元）" :value="data.totalAmount" :value-style="{ color: '#e6a23c' }" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="覆盖院系" :value="data.byDepartment.length" :value-style="{ color: '#67c23a' }" />
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="10">
            <div ref="pieRef" class="chart-box" />
          </el-col>
          <el-col :xs="24" :md="14">
            <div ref="stackRef" class="chart-box" />
          </el-col>
        </el-row>

        <el-table v-if="data" :data="tableRows" border style="margin-top: 16px" show-summary :summary-method="getSummary">
          <el-table-column label="院系" prop="departmentName" min-width="160" />
          <el-table-column label="奖学金" prop="SCHOLARSHIP" width="100" align="center" />
          <el-table-column label="助学金" prop="AID" width="100" align="center" />
          <el-table-column label="助学贷款" prop="LOAN" width="110" align="center" />
          <el-table-column label="评优" prop="HONOR" width="90" align="center" />
          <el-table-column label="合计" prop="total" width="100" align="center" />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import { Search, Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { getAwardReport, exportReport, type AwardReport } from '@/api/report';

const loading = ref(false);
const exporting = ref(false);
const data = ref<AwardReport | null>(null);
const semester = ref('');

const pieRef = ref<HTMLElement>();
const stackRef = ref<HTMLElement>();
let pieChart: echarts.ECharts | null = null;
let stackChart: echarts.ECharts | null = null;

const tableRows = computed(() => {
  if (!data.value) return [];
  return data.value.byDepartment.map((d) => ({
    ...d,
    total: d.SCHOLARSHIP + d.AID + d.LOAN + d.HONOR,
  }));
});

function getSummary({ columns, data: rows }: any): any[] {
  const summary: any[] = [];
  columns.forEach((col: any, i: number) => {
    if (i === 0) { summary.push('合计'); return; }
    const field = col.property;
    if (!field) { summary.push(''); return; }
    const total = rows.reduce((sum: number, r: any) => sum + (r[field] || 0), 0);
    summary.push(total);
  });
  return summary;
}

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    data.value = await getAwardReport(semester.value || undefined);
    await nextTick();
    renderCharts();
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

function renderCharts(): void {
  if (!data.value) return;

  if (pieRef.value) {
    if (!pieChart) pieChart = echarts.init(pieRef.value, 'edu');
    pieChart.setOption({
      title: { text: '奖助类型分布（人次）', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c}人 ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: data.value.byType.map((t) => ({ name: t.name, value: t.count })),
      }],
    });
  }

  if (stackRef.value) {
    if (!stackChart) stackChart = echarts.init(stackRef.value, 'edu');
    const depts = data.value.byDepartment.map((d) => d.departmentName);
    stackChart.setOption({
      title: { text: '各院系奖助人次（堆叠）', left: 'center' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, data: ['奖学金', '助学金', '助学贷款', '评优'] },
      xAxis: { type: 'category', data: depts, axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        { name: '奖学金', type: 'bar', stack: 'total', data: data.value.byDepartment.map((d) => d.SCHOLARSHIP) },
        { name: '助学金', type: 'bar', stack: 'total', data: data.value.byDepartment.map((d) => d.AID) },
        { name: '助学贷款', type: 'bar', stack: 'total', data: data.value.byDepartment.map((d) => d.LOAN) },
        { name: '评优', type: 'bar', stack: 'total', data: data.value.byDepartment.map((d) => d.HONOR) },
      ],
    });
  }
}

async function onExport(format: 'excel' | 'pdf'): Promise<void> {
  exporting.value = true;
  try {
    await exportReport('award', format, { semester: semester.value || undefined });
    ElMessage.success('导出成功');
  } catch { /* ignore */ } finally {
    exporting.value = false;
  }
}

function onResize(): void {
  pieChart?.resize();
  stackChart?.resize();
}

onMounted(() => {
  loadData();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  pieChart?.dispose();
  stackChart?.dispose();
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
