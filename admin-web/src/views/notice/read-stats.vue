<template>
  <div class="read-stats-page">
    <PageHeader title="阅读统计" subtitle="查看通知公告的阅读情况与未读名单">
      <template #extra>
        <el-button :icon="Back" @click="goBack">返回列表</el-button>
      </template>
    </PageHeader>

    <!-- 通知选择器 -->
    <el-card class="notice-selector-card">
      <el-form :inline="true">
        <el-form-item label="选择通知">
          <el-select
            v-model="selectedNoticeId"
            filterable
            placeholder="请选择要查看的通知"
            style="width: 400px"
            @change="onNoticeChange"
          >
            <el-option
              v-for="n in noticeOptions"
              :key="n.id"
              :label="`[${scopeLabel(n.scope)}] ${n.title}`"
              :value="n.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <template v-if="selectedNoticeId">
      <!-- 统计概览 -->
      <el-card v-loading="statsLoading" class="stats-card">
        <template v-if="stats">
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-item__value">{{ stats.totalShouldRead }}</div>
                <div class="stat-item__label">应读人数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item stat-item--success">
                <div class="stat-item__value">{{ stats.readCount }}</div>
                <div class="stat-item__label">已读人数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item stat-item--warning">
                <div class="stat-item__value">{{ stats.unreadCount }}</div>
                <div class="stat-item__label">未读人数</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-item stat-item--primary">
                <div class="stat-item__value">{{ stats.readRate }}%</div>
                <div class="stat-item__label">阅读率</div>
              </div>
            </el-col>
          </el-row>

          <!-- 阅读率进度条 -->
          <div class="read-progress">
            <span class="read-progress__label">阅读进度</span>
            <el-progress
              :percentage="stats.readRate"
              :stroke-width="20"
              :text-inside="true"
              status="success"
            />
          </div>

          <!-- 通知信息 -->
          <el-descriptions :column="3" border size="small" class="notice-info">
            <el-descriptions-item label="通知标题">{{ stats.title }}</el-descriptions-item>
            <el-descriptions-item label="可见范围">
              <el-tag :type="scopeTagType(stats.scope)" size="small">{{ scopeLabel(stats.scope) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="发布状态">
              <el-tag v-if="!stats.published" type="warning" size="small">草稿</el-tag>
              <el-tag v-else type="success" size="small">已发布</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="发布时间">{{ formatDateTime(stats.publishAt) }}</el-descriptions-item>
          </el-descriptions>
        </template>
      </el-card>

      <!-- 已读/未读学生列表 -->
      <el-card class="reader-card">
        <div class="reader-header">
          <el-tabs v-model="readFilter" @tab-change="onFilterChange">
            <el-tab-pane label="全部" name="all" />
            <el-tab-pane label="已读" name="read" />
            <el-tab-pane label="未读" name="unread" />
          </el-tabs>
        </div>

        <el-table v-loading="readersLoading" :data="readers" border row-key="id">
          <el-table-column prop="studentNo" label="学号" width="120" />
          <el-table-column prop="name" label="姓名" width="100" />
          <el-table-column label="院系" min-width="140">
            <template #default="{ row }">{{ row.department?.name || '—' }}</template>
          </el-table-column>
          <el-table-column label="班级" width="140">
            <template #default="{ row }">{{ row.class?.name || '—' }}</template>
          </el-table-column>
          <el-table-column label="阅读状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.isRead" type="success" size="small">已读</el-tag>
              <el-tag v-else type="warning" size="small">未读</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="阅读时间" width="170">
            <template #default="{ row }">{{ row.readAt ? formatDateTime(row.readAt) : '—' }}</template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :total="pagination.total"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="loadReaders"
            @size-change="onSizeChange"
          />
        </div>
      </el-card>
    </template>

    <el-empty v-else description="请选择一条通知查看阅读统计" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Back } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listNotices, getReadStats, getReaders, type ReadStatsResult, type ReaderResult } from '@/api/notice';
import { NoticeScope } from '@shared-web/types';
import { formatDateTime } from '@shared-web/utils/format';

const route = useRoute();
const router = useRouter();

const selectedNoticeId = ref('');
const noticeOptions = ref<{ id: string; title: string; scope: NoticeScope }[]>([]);
const statsLoading = ref(false);
const readersLoading = ref(false);
const stats = ref<ReadStatsResult | null>(null);
const readers = ref<ReaderResult[]>([]);
const readFilter = ref<'all' | 'read' | 'unread'>('all');

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });

// ========== 工具函数 ==========

function scopeLabel(scope: NoticeScope): string {
  return { SCHOOL: '全校', DEPARTMENT: '院系', CLASS: '班级' }[scope] || scope;
}

function scopeTagType(scope: NoticeScope): 'danger' | 'primary' | 'success' {
  return { SCHOOL: 'danger', DEPARTMENT: 'primary', CLASS: 'success' }[scope] || 'primary';
}

function goBack(): void {
  router.push('/notice/list');
}

// ========== 数据加载 ==========

async function loadNoticeOptions(): Promise<void> {
  try {
    const res = await listNotices({ page: 1, pageSize: 1000 });
    noticeOptions.value = res.list.map((n) => ({ id: n.id, title: n.title, scope: n.scope }));
    // 如果 URL 带了 id 参数，自动选中
    const queryId = route.query.id as string;
    if (queryId && noticeOptions.value.some((n) => n.id === queryId)) {
      selectedNoticeId.value = queryId;
      await onNoticeChange(queryId);
    }
  } catch { /* ignore */ }
}

async function onNoticeChange(id: string): Promise<void> {
  if (!id) {
    stats.value = null;
    readers.value = [];
    return;
  }
  // 更新 URL query（不影响路由匹配）
  router.replace({ path: '/notice/read-stats', query: { id } });
  pagination.page = 1;
  readFilter.value = 'all';
  await Promise.all([loadStats(), loadReaders()]);
}

async function loadStats(): Promise<void> {
  statsLoading.value = true;
  try {
    stats.value = await getReadStats(selectedNoticeId.value);
  } catch { /* ignore */ } finally {
    statsLoading.value = false;
  }
}

async function loadReaders(): Promise<void> {
  if (!selectedNoticeId.value) return;
  readersLoading.value = true;
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
    if (readFilter.value === 'read') params.read = true;
    else if (readFilter.value === 'unread') params.read = false;
    const res = await getReaders(selectedNoticeId.value, params);
    readers.value = res.list;
    pagination.total = res.total;
  } catch { /* ignore */ } finally {
    readersLoading.value = false;
  }
}

function onFilterChange(): void {
  pagination.page = 1;
  loadReaders();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadReaders();
}

// ========== 初始化 ==========

onMounted(() => {
  loadNoticeOptions();
});
</script>

<style scoped lang="scss">
.read-stats-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.notice-selector-card {
  margin-bottom: 16px;
}
.stats-card {
  margin-bottom: 16px;
}
.stat-item {
  text-align: center;
  padding: 16px 0;
  &__value {
    font-size: 32px;
    font-weight: 700;
    color: var(--el-text-color-primary);
    line-height: 1.2;
  }
  &__label {
    margin-top: 8px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
  &--success &__value { color: var(--el-color-success); }
  &--warning &__value { color: var(--el-color-warning); }
  &--primary &__value { color: var(--el-color-primary); }
}
.read-progress {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  &__label {
    font-size: 14px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }
  .el-progress {
    flex: 1;
  }
}
.notice-info {
  margin-top: 20px;
}
.reader-card {
  .reader-header {
    margin-bottom: 12px;
  }
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
