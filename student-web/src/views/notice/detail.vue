<template>
  <div class="notice-detail-page">
    <PageHeader :title="notice?.title || '通知详情'" />

    <el-card v-loading="loading">
      <template v-if="notice">
        <div class="notice-meta">
          <el-tag :type="scopeTag(notice.scope)" size="small">{{ scopeLabel(notice.scope) }}</el-tag>
          <span class="meta-item">发布时间：{{ formatDateTime(notice.publishAt) }}</span>
        </div>

        <el-divider />

        <div class="notice-content" v-html="notice.content"></div>

        <el-divider v-if="attachmentList.length" />

        <div v-if="attachmentList.length" class="notice-attachments">
          <h4>附件下载</h4>
          <div v-for="(att, idx) in attachmentList" :key="idx" class="attachment-item">
            <el-link type="primary" :underline="false" @click="downloadAttachment(att)">
              <el-icon><Paperclip /></el-icon>
              {{ attachmentName(att, idx) }}
            </el-link>
          </div>
        </div>
      </template>

      <el-empty v-else-if="!loading" description="通知不存在或您无权查看" />

      <div class="notice-footer">
        <el-button @click="goBack">返回列表</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Paperclip } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { getNoticeDetail } from '@/api/notice';
import { useNoticeStore } from '@/stores/notice';
import { NoticeScope } from '@shared-web/types';
import type { Notice } from '@shared-web/types';
import { formatDateTime } from '@shared-web/utils/format';
import { downloadFile } from '@shared-web/utils/download';

const route = useRoute();
const router = useRouter();
const noticeStore = useNoticeStore();
const loading = ref(false);
const notice = ref<Notice | null>(null);

const attachmentList = computed(() => {
  const atts = notice.value?.attachments;
  if (!atts) return [];
  return Array.isArray(atts) ? atts : [];
});

function scopeLabel(scope: NoticeScope): string {
  const map: Record<string, string> = {
    SCHOOL: '全校',
    DEPARTMENT: '院系',
    CLASS: '班级',
  };
  return map[scope] || scope;
}

function scopeTag(scope: NoticeScope): 'primary' | 'success' | 'warning' | 'danger' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    SCHOOL: 'danger',
    DEPARTMENT: 'primary',
    CLASS: 'success',
  };
  return map[scope] || 'info';
}

function attachmentName(att: string, idx: number): string {
  if (!att) return `附件${idx + 1}`;
  // 取 URL 最后一段作为显示名
  const seg = att.split(/[\\/]/).pop();
  return seg || `附件${idx + 1}`;
}

function downloadAttachment(att: string): void {
  if (!att) return;
  downloadFile('/shared/files/download', { url: att }, attachmentName(att, 0));
}

function goBack(): void {
  router.push('/notice');
}

async function fetchDetail(): Promise<void> {
  loading.value = true;
  try {
    notice.value = await getNoticeDetail(route.params.id as string);
    // 详情页自动标记已读后，刷新未读角标
    noticeStore.fetchUnreadCount();
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchDetail();
});
</script>

<style scoped lang="scss">
.notice-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.notice-content {
  line-height: 1.8;
  font-size: 15px;
  :deep(p) {
    margin-bottom: 12px;
  }
}
.notice-attachments {
  h4 {
    margin-bottom: 12px;
  }
  .attachment-item {
    margin-bottom: 8px;
  }
}
.notice-footer {
  margin-top: 24px;
  text-align: center;
}
.meta-item {
  color: var(--el-text-color-secondary);
}
</style>
