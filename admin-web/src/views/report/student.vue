<template>
  <div class="report-page">
    <PageHeader title="学生人数统计" subtitle="按院系 / 性别 / 年级 / 学籍状态聚合">
      <template #extra>
        <el-button :icon="Download" @click="onExport('excel')" :loading="exporting">导出 Excel</el-button>
        <el-button :icon="Download" @click="onExport('pdf')" :loading="exporting">导出 PDF</el-button>
      </template>
    </PageHeader>

    <el-card>
      <div class="search-bar">
        <span class="search-label">院系筛选：</span>
        <el-select v-model="departmentId" placeholder="全部院系" clearable filterable style="width: 220px" @change="loadData">
          <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="loadData">查询</el-button>
      </div>

      <div v-loading="loading">
        <el-row :gutter="16" v-if="data">
          <el-col :span="6">
            <el-statistic title="学生总数" :value="data.total" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="男生" :value="maleCount" :value-style="{ color: '#409eff' }" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="女生" :value="femaleCount" :value-style="{ color: '#f56c6c' }" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="院系数" :value="data.byDepartment.length" :value-style="{ color: '#67c23a' }" />
          </el-col>
        </el-row>

        <el-row :gutter="16">
          <el-col :xs="24" :md="12">
            <div ref="genderRef" class="chart-box" />
          </el-col>
          <el-col :xs="24" :md="12">
            <div ref="deptRef" class="chart-box" />
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :xs="24" :md="12">
            <div ref="gradeRef" class="chart-box" />
          </el-col>
          <el-col :xs="24" :md="12">
            <div ref="statusRef" class="chart-box" />
          </el-col>
        </el-row>

        <el-table v-if="data" :data="data.byDepartment" border style="margin-top: 16px">
          <el-table-column label="院系" prop="departmentName" min-width="180" />
          <el-table-column label="学生人数" prop="count" width="140" align="right" sortable />
          <el-table-column label="占比" width="240">
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as echarts from 'echarts';
import { Search, Download } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { eduChartColors } from '@shared-web/utils/echarts-theme';
import { getStudentCountReport, exportReport, type StudentCountReport } from '@/api/report';
import { getDepartmentList } from '@/api/base';
import type { Department } from '@shared-web/types';

const loading = ref(false);
const exporting = ref(false);
const data = ref<StudentCountReport | null>(null);
const departmentId = ref('');
const departments = ref<Department[]>([]);

const genderRef = ref<HTMLElement>();
const deptRef = ref<HTMLElement>();
const gradeRef = ref<HTMLElement>();
const statusRef = ref<HTMLElement>();
let genderChart: echarts.ECharts | null = null;
let deptChart: echarts.ECharts | null = null;
let gradeChart: echarts.ECharts | null = null;
let statusChart: echarts.ECharts | null = null;

const maleCount = computed(() => data.value?.byGender.find((g) => g.name === '男')?.value || 0);
const femaleCount = computed(() => data.value?.byGender.find((g) => g.name === '女')?.value || 0);

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    data.value = await getStudentCountReport(departmentId.value || undefined);
    await nextTick();
    renderCharts();
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

function renderCharts(): void {
  if (!data.value) return;

  if (genderRef.value) {
    if (!genderChart) genderChart = echarts.init(genderRef.value, 'edu');
    genderChart.setOption({
      title: { text: '性别分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: data.value.byGender.map((g) => ({ name: g.name, value: g.value })),
        color: [eduChartColors.primary, eduChartColors.danger],
      }],
    });
  }

  if (deptRef.value) {
    if (!deptChart) deptChart = echarts.init(deptRef.value, 'edu');
    deptChart.setOption({
      title: { text: '院系人数分布', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.value.byDepartment.map((d) => d.departmentName), axisLabel: { rotate: 30 } },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.value.byDepartment.map((d) => d.count), label: { show: true, position: 'top' } }],
    });
  }

  if (gradeRef.value) {
    if (!gradeChart) gradeChart = echarts.init(gradeRef.value, 'edu');
    gradeChart.setOption({
      title: { text: '年级分布', left: 'center' },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: data.value.byGrade.map((g) => `${g.grade}级`) },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', data: data.value.byGrade.map((g) => g.count), label: { show: true, position: 'top' } }],
    });
  }

  if (statusRef.value) {
    if (!statusChart) statusChart = echarts.init(statusRef.value, 'edu');
    statusChart.setOption({
      title: { text: '学籍状态分布', left: 'center' },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: '60%',
        data: data.value.byStatus.map((s) => ({ name: s.name, value: s.value })),
      }],
    });
  }
}

async function onExport(format: 'excel' | 'pdf'): Promise<void> {
  exporting.value = true;
  try {
    await exportReport('student', format, { departmentId: departmentId.value || undefined });
    ElMessage.success('导出成功');
  } catch { /* ignore */ } finally {
    exporting.value = false;
  }
}

function onResize(): void {
  genderChart?.resize();
  deptChart?.resize();
  gradeChart?.resize();
  statusChart?.resize();
}

onMounted(async () => {
  try {
    departments.value = await getDepartmentList();
  } catch { /* ignore */ }
  loadData();
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  genderChart?.dispose();
  deptChart?.dispose();
  gradeChart?.dispose();
  statusChart?.dispose();
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
