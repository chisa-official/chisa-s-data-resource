<template>
  <div class="score-page">
    <PageHeader title="我的成绩" subtitle="查看各学期成绩与绩点趋势">
      <template #extra>
        <el-select v-model="selectedSemester" placeholder="全部学期" clearable size="small" style="width: 160px" @change="fetchData">
          <el-option v-for="s in semesterList" :key="s" :label="s" :value="s" />
        </el-select>
      </template>
    </PageHeader>

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card v-loading="gpaLoading">
          <div class="gpa-summary">
            <div class="gpa-summary__item">
              <div class="gpa-summary__value">{{ gpa?.overallGpa?.toFixed(2) || '0.00' }}</div>
              <div class="gpa-summary__label">总 GPA</div>
            </div>
            <div class="gpa-summary__item">
              <div class="gpa-summary__value">{{ gpa?.totalCredits?.toFixed(1) || '0' }}</div>
              <div class="gpa-summary__label">总学分</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card v-loading="gpaLoading">
          <template #header>
            <span>绩点趋势</span>
          </template>
          <div ref="chartRef" class="gpa-chart"></div>
          <el-empty v-if="!gpa?.semesters?.length" description="暂无绩点数据" />
        </el-card>
      </el-col>
    </el-row>

    <el-card style="margin-top: 20px" v-loading="loading">
      <template #header>
        <span>成绩明细</span>
      </template>
      <el-empty v-if="!scoreList.length" description="暂无成绩记录" />
      <template v-for="(items, sem) in groupedScores" :key="sem">
        <div class="semester-group">
          <div class="semester-group__title">{{ sem }}（共 {{ items.length }} 门）</div>
          <el-table :data="items" size="small" border>
            <el-table-column label="课程代码" prop="course.code" width="100" />
            <el-table-column label="课程名称" prop="course.name" min-width="150" />
            <el-table-column label="类型" width="80">
              <template #default="{ row }">
                <el-tag size="small" :type="courseTypeTag(row.course.type)">{{ courseTypeLabel(row.course.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="学分" prop="course.credit" width="70" align="center" />
            <el-table-column label="平时成绩" prop="usualScore" width="90" align="center">
              <template #default="{ row }">{{ row.usualScore ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="考试成绩" prop="examScore" width="90" align="center">
              <template #default="{ row }">{{ row.examScore ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="总评" prop="finalScore" width="80" align="center">
              <template #default="{ row }">
                <span :class="{ 'score-fail': row.finalScore < 60 }">{{ row.finalScore }}</span>
              </template>
            </el-table-column>
            <el-table-column label="绩点" prop="gpaPoint" width="70" align="center" />
            <el-table-column label="重修" width="70" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.retake" type="warning" size="small">重修</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import * as echarts from 'echarts';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { eduChartColors } from '@shared-web/utils/echarts-theme';
import { getScores, getGpa, type ScoreWithCourse, type GpaResult } from '@/api/course';

const loading = ref(false);
const gpaLoading = ref(false);
const scoreList = ref<ScoreWithCourse[]>([]);
const groupedScores = ref<Record<string, ScoreWithCourse[]>>({});
const gpa = ref<GpaResult | null>(null);
const selectedSemester = ref<string>('');
const chartRef = ref<HTMLElement>();
let chartInstance: echarts.ECharts | null = null;

const semesterList = computed(() => Object.keys(groupedScores.value).sort().reverse());

function courseTypeLabel(type: string): string {
  const map: Record<string, string> = { REQUIRED: '必修', ELECTIVE: '选修', PUBLIC: '公共' };
  return map[type] || type;
}

function courseTypeTag(type: string): 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    REQUIRED: 'primary',
    ELECTIVE: 'success',
    PUBLIC: 'warning',
  };
  return map[type] || 'info';
}

function renderChart(): void {
  if (!chartRef.value || !gpa.value?.semesters?.length) return;
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value, 'edu');
  }
  const sorted = [...gpa.value.semesters].sort((a, b) => a.semester.localeCompare(b.semester));
  chartInstance.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: sorted.map((s) => s.semester) },
    yAxis: { type: 'value', min: 0, max: 4 },
    series: [
      {
        name: 'GPA',
        type: 'line',
        data: sorted.map((s) => s.gpa),
        itemStyle: { color: eduChartColors.primary },
        areaStyle: { opacity: 0.2 },
        label: { show: true, formatter: '{c}' },
      },
      {
        name: '学分',
        type: 'bar',
        data: sorted.map((s) => s.totalCredits),
        itemStyle: { color: eduChartColors.success, opacity: 0.6 },
        yAxisIndex: 0,
      },
    ],
  });
}

async function fetchScores(): Promise<void> {
  loading.value = true;
  try {
    const data = await getScores(selectedSemester.value || undefined);
    scoreList.value = data.list;
    groupedScores.value = data.grouped;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

async function fetchGpa(): Promise<void> {
  gpaLoading.value = true;
  try {
    gpa.value = await getGpa(selectedSemester.value || undefined);
    await nextTick();
    renderChart();
  } catch {
    // ignore
  } finally {
    gpaLoading.value = false;
  }
}

async function fetchData(): Promise<void> {
  await Promise.all([fetchScores(), fetchGpa()]);
}

function handleResize(): void {
  chartInstance?.resize();
}

onMounted(() => {
  fetchData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});

watch(gpa, () => {
  nextTick(() => renderChart());
});
</script>

<style scoped lang="scss">
.gpa-summary {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  &__item {
    text-align: center;
  }
  &__value {
    font-size: 32px;
    font-weight: 700;
    color: var(--el-color-primary);
  }
  &__label {
    margin-top: 4px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
.gpa-chart {
  height: 260px;
}
.semester-group {
  margin-bottom: 24px;
  &__title {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--el-text-color-primary);
    padding-left: 8px;
    border-left: 3px solid var(--el-color-primary);
  }
}
.score-fail {
  color: var(--el-color-danger);
  font-weight: 600;
}
</style>
