<template>
  <div class="dashboard">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="welcome-banner__content">
        <div class="welcome-banner__greeting">
          <el-icon :size="28"><Sunny /></el-icon>
          <span>{{ greeting }}，{{ adminName }}</span>
        </div>
        <p class="welcome-banner__role">{{ adminRole }} · {{ today }}</p>
      </div>
      <div class="welcome-banner__decor" />
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="dashboard__section">
      <el-col v-for="item in cards" :key="item.key" :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover" class="stat-card" v-loading="loading">
          <div class="stat-card__inner">
            <div class="stat-card__icon" :style="{ background: item.bg, color: item.color }">
              <el-icon :size="26"><component :is="item.icon" /></el-icon>
            </div>
            <div class="stat-card__body">
              <p class="stat-card__value">{{ formatNumber(item.value) }}</p>
              <p class="stat-card__label">{{ item.label }}</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 中部双栏 -->
    <el-row :gutter="20" class="dashboard__section">
      <el-col :xs="24" :lg="16">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-card__title">
              <el-icon><Bell /></el-icon>
              <span>待办事项</span>
            </div>
          </template>
          <div v-loading="loading">
            <router-link v-for="t in todos" :key="t.key" :to="t.path" class="todo-item">
              <div class="todo-item__left">
                <div class="todo-item__icon" :style="{ background: t.bg, color: t.color }">
                  <el-icon :size="18"><component :is="t.icon" /></el-icon>
                </div>
                <div class="todo-item__info">
                  <span class="todo-item__label">{{ t.label }}</span>
                  <span class="todo-item__desc">{{ t.desc }}</span>
                </div>
              </div>
              <div class="todo-item__right">
                <span v-if="t.value > 0" class="todo-item__count" :style="{ color: t.color }">{{ t.value }}</span>
                <el-button type="primary" link size="small">去处理</el-button>
              </div>
            </router-link>
            <EmptyState v-if="!loading && totalTodo === 0" description="暂无待办事项" type="list" />
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="8">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-card__title">
              <el-icon><DataLine /></el-icon>
              <span>待办分布</span>
            </div>
          </template>
          <div ref="chartRef" class="todo-chart" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷入口 -->
    <el-row :gutter="20" class="dashboard__section">
      <el-col :span="24">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-card__title">
              <el-icon><Menu /></el-icon>
              <span>快捷入口</span>
            </div>
          </template>
          <div class="quick-entry">
            <router-link v-for="q in quickEntries" :key="q.path" :to="q.path" class="quick-entry__item">
              <div class="quick-entry__icon" :style="{ background: q.bg, color: q.color }">
                <el-icon :size="22"><component :is="q.icon" /></el-icon>
              </div>
              <span>{{ q.label }}</span>
            </router-link>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import * as echarts from 'echarts';
import EmptyState from '@shared-web/components/EmptyState.vue';
import { getDashboardStats, type DashboardStats } from '@/api/dashboard';
import { useUserStore } from '@/stores/user';

const loading = ref(false);
const stats = ref<DashboardStats | null>(null);
const userStore = useUserStore();
const chartRef = ref<HTMLDivElement | null>(null);
let chartInstance: echarts.ECharts | null = null;

const adminName = computed(() => userStore.adminInfo?.realName || userStore.adminInfo?.username || '管理员');
const adminRole = computed(() => userStore.adminInfo?.roleName || '管理员');

const today = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]}`;
});

const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

const totalTodo = computed(() => {
  if (!stats.value) return 0;
  return stats.value.pendingStatusChanges + stats.value.pendingLeaves + stats.value.pendingAwards + stats.value.pendingRepairs;
});

const cards = computed(() => [
  { key: 'student', label: '学生总数', value: stats.value?.studentCount ?? 0, icon: 'User', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  { key: 'pending', label: '待审批', value: totalTodo.value, icon: 'Warning', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  { key: 'notice', label: '未读通知', value: stats.value?.noticeCount ?? 0, icon: 'Bell', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  { key: 'course', label: '课程总数', value: stats.value?.courseCount ?? 0, icon: 'Reading', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
]);

const todos = computed(() => [
  { key: 'status', label: '学籍异动审批', desc: '待处理的休学、复学、退学等申请', value: stats.value?.pendingStatusChanges ?? 0, path: '/status/change', icon: 'RefreshRight', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  { key: 'leave', label: '请假审批', desc: '学生请假申请待审核', value: stats.value?.pendingLeaves ?? 0, path: '/affairs/leave', icon: 'Calendar', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  { key: 'award', label: '奖助申请审核', desc: '奖学金、助学金、贷款申请', value: stats.value?.pendingAwards ?? 0, path: '/affairs/award/audit', icon: 'Trophy', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  { key: 'repair', label: '报修工单处理', desc: '宿舍、设施报修待处理', value: stats.value?.pendingRepairs ?? 0, path: '/dorm/repair', icon: 'Tools', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
]);

const quickEntries = [
  { path: '/system/user', label: '用户管理', icon: 'UserFilled', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' },
  { path: '/status/student', label: '学生档案', icon: 'User', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  { path: '/notice/list', label: '通知公告', icon: 'Bell', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  { path: '/report/student', label: '报表统计', icon: 'DataLine', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  { path: '/system/log/login', label: '登录日志', icon: 'Document', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' },
  { path: '/academic/schedule', label: '排课管理', icon: 'Calendar', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
];

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function initChart(): void {
  if (!chartRef.value) return;
  chartInstance = echarts.init(chartRef.value, 'edu');
  updateChart();
  window.addEventListener('resize', handleResize);
}

function updateChart(): void {
  if (!chartInstance) return;
  const data = todos.value.map((t) => ({ name: t.label, value: t.value })).filter((d) => d.value > 0);
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12, color: '#64748b' } },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: data.length ? data : [{ name: '暂无待办', value: 1 }],
    }],
  };
  chartInstance.setOption(option);
}

function handleResize(): void {
  chartInstance?.resize();
}

async function loadStats(): Promise<void> {
  loading.value = true;
  try {
    stats.value = await getDashboardStats();
    updateChart();
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadStats();
  initChart();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  chartInstance?.dispose();
});
</script>

<style scoped lang="scss">
.dashboard {
  &__section {
    margin-top: $space-5;
  }
}

.welcome-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-6 $space-7;
  background: linear-gradient(135deg, $brand-primary 0%, $brand-primary-dark 100%);
  border-radius: $radius-2xl;
  color: $text-inverse;
  overflow: hidden;
  box-shadow: $shadow-medium;

  &__content {
    position: relative;
    z-index: 1;
  }

  &__greeting {
    display: flex;
    align-items: center;
    gap: $space-3;
    font-size: $font-size-2xl;
    font-weight: $font-weight-semibold;

    .el-icon {
      color: rgba(255, 255, 255, 0.9);
    }
  }

  &__role {
    margin: $space-2 0 0;
    font-size: $font-size-sm;
    color: rgba(255, 255, 255, 0.75);
  }

  &__decor {
    position: absolute;
    right: -40px;
    top: -40px;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    z-index: 0;

    &::after {
      content: '';
      position: absolute;
      right: 60px;
      top: 60px;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
    }
  }
}

.stat-card {
  margin-bottom: $space-5;

  &__inner {
    display: flex;
    align-items: center;
    gap: $space-4;
  }

  &__icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: $radius-xl;
  }

  &__value {
    margin: 0;
    font-size: $font-size-2xl;
    font-weight: $font-weight-bold;
    color: $text-primary;
    line-height: $line-height-tight;
  }

  &__label {
    margin: $space-1 0 0;
    font-size: $font-size-sm;
    color: $text-secondary;
  }
}

.panel-card {
  height: 100%;

  &__title {
    display: flex;
    align-items: center;
    gap: $space-2;
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    color: $text-primary;
  }
}

.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4 $space-3;
  border-radius: $radius-lg;
  transition: background 0.2s;
  text-decoration: none;

  &:hover {
    background: $bg-hover;
  }

  & + .todo-item {
    border-top: 1px solid $border-light;
  }

  &__left {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  &__icon {
    @include flex-center;
    width: 36px;
    height: 36px;
    border-radius: $radius-lg;
    flex-shrink: 0;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__label {
    font-size: $font-size-base;
    color: $text-primary;
    font-weight: $font-weight-medium;
  }

  &__desc {
    font-size: $font-size-xs;
    color: $text-tertiary;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  &__count {
    min-width: 24px;
    height: 24px;
    padding: 0 $space-2;
    border-radius: $radius-full;
    background: currentColor;
    background: rgba(0, 0, 0, 0.06);
    font-size: $font-size-sm;
    font-weight: $font-weight-bold;
    @include flex-center;
  }
}

.todo-chart {
  width: 100%;
  height: 280px;
}

.quick-entry {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: $space-4;

  &__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-3;
    padding: $space-5 $space-3;
    border: 1px solid $border-light;
    border-radius: $radius-xl;
    color: $text-secondary;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    transition: all 0.2s;
    text-decoration: none;
    background: $bg-surface;

    &:hover {
      border-color: $brand-primary-lighter;
      color: $brand-primary;
      background: rgba(37, 99, 235, 0.04);
      transform: translateY(-2px);
      box-shadow: $shadow-medium;
    }
  }

  &__icon {
    @include flex-center;
    width: 44px;
    height: 44px;
    border-radius: $radius-lg;
  }
}
</style>
