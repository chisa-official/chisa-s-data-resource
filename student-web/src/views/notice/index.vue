<template>
  <div class="notice-page">
    <PageHeader title="通知公告" subtitle="查看全校、院系及班级通知" />

    <el-card>
      <el-tabs v-model="activeScope" @tab-change="onTabChange">
        <el-tab-pane label="全部" name="" />
        <el-tab-pane label="全校" name="SCHOOL" />
        <el-tab-pane label="院系" name="DEPARTMENT" />
        <el-tab-pane label="班级" name="CLASS" />
      </el-tabs>

      <el-table :data="notices" v-loading="loading" size="default" border style="width: 100%">
        <el-table-column label="标题" min-width="300">
          <template #default="{ row }">
            <el-link type="primary" @click="goDetail(row.id)">
              <span :class="{ 'notice-unread': !row.isRead }">{{ row.title }}</span>
            </el-link>
            <el-tag v-if="!row.isRead" type="danger" size="small" class="ml-8">未读</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="范围" width="100">
          <template #default="{ row }">
            <el-tag :type="scopeTag(row.scope)" size="small">{{ scopeLabel(row.scope) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发布时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.publishAt) }}</template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && !notices.length" description="暂无通知" />
      <div v-if="pagination.total > pagination.pageSize" class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          :total="pagination.total"
          :page-size="pagination.pageSize"
          layout="prev, pager, next"
          @current-change="fetchNotices"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { usePagination } from '@shared-web/composables/usePagination';
import { getNoticeList } from '@/api/notice';
import { useNoticeStore } from '@/stores/notice';
import { NoticeScope } from '@shared-web/types';
import type { Notice } from '@shared-web/types';
import { formatDateTime } from '@shared-web/utils/format';

const router = useRouter();
const noticeStore = useNoticeStore();
const loading = ref(false);
const notices = ref<Notice[]>([]);
const activeScope = ref('');
const { pagination } = usePagination(10);

function scopeLabel(scope: NoticeScope): string {
  const map: Record<string, string> = {
    SCHOOL: '全校',
    DEPARTMENT: '院系',
    CLASS: '班级',
  };
  return map[scope] || scope;
}

function scopeTag(scope: NoticeScope): 'primary' | 'success' | 'warning' {
  const map: Record<string, 'primary' | 'success' | 'warning'> = {
    SCHOOL: 'danger' as any,
    DEPARTMENT: 'primary',
    CLASS: 'success',
  };
  return map[scope] || 'info' as any;
}

function goDetail(id: string): void {
  router.push(`/notice/${id}`);
}

function onTabChange(): void {
  pagination.page = 1;
  fetchNotices();
}

async function fetchNotices(): Promise<void> {
  loading.value = true;
  try {
    const data = await getNoticeList({
      scope: activeScope.value ? (activeScope.value as NoticeScope) : undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    notices.value = data.list;
    pagination.total = data.total;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchNotices();
  // 刷新未读角标
  noticeStore.fetchUnreadCount();
});
</script>

<style scoped lang="scss">
.notice-unread {
  font-weight: 600;
}
.ml-8 {
  margin-left: 8px;
}
.pagination-wrap {
  margin-top: 16px;
  text-align: right;
}
</style>
