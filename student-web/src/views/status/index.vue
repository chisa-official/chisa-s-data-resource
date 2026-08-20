<template>
  <div class="status-page">
    <PageHeader title="学籍管理" subtitle="查看学籍状态、申请异动与证明" />

    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="status-card" v-loading="loading">
          <div class="status-card__header">
            <el-icon><Document /></el-icon>
            <span>当前学籍状态</span>
          </div>
          <div class="status-card__body">
            <h3>{{ statusInfo?.name }}</h3>
            <p>学号：{{ statusInfo?.studentNo }}</p>
            <p>院系：{{ statusInfo?.department?.name || '-' }}</p>
            <p>班级：{{ statusInfo?.class?.name || '-' }}</p>
            <div class="status-card__tag">
              <StatusTag :status="statusInfo?.status" />
            </div>
            <p v-if="statusInfo?.enrollDate">入学：{{ formatDate(statusInfo.enrollDate) }}</p>
          </div>
          <div class="status-card__actions">
            <el-button type="primary" size="small" @click="goApply(StatusChangeType.SUSPEND)">休学申请</el-button>
            <el-button size="small" @click="goApply(StatusChangeType.RESUME)">复学申请</el-button>
            <el-button size="small" @click="goApply(StatusChangeType.TRANSFER_MAJOR)">转专业</el-button>
            <el-button type="danger" size="small" plain @click="goApply(StatusChangeType.DROP_OUT)">退学申请</el-button>
          </div>
          <el-divider />
          <el-button type="success" size="small" plain @click="router.push('/status/certificate')">
            申请证明
          </el-button>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card>
          <template #header>
            <span>学籍异动申请记录</span>
          </template>
          <el-empty v-if="!changes.length && !loading" description="暂无异动申请记录" />
          <el-timeline v-else v-loading="loading">
            <el-timeline-item
              v-for="item in changes"
              :key="item.id"
              :timestamp="formatDateTime(item.createdAt)"
              :type="timelineType(item.status)"
            >
              <el-card shadow="never" class="timeline-card">
                <div class="timeline-card__header">
                  <span class="timeline-card__title">{{ typeLabel(item.type) }}</span>
                  <StatusTag :status="item.status" />
                </div>
                <p class="timeline-card__reason">{{ item.reason }}</p>
                <p v-if="item.beforeStatus || item.afterStatus" class="timeline-card__status">
                  {{ statusLabel(item.beforeStatus) }}
                  <span v-if="item.afterStatus"> → {{ statusLabel(item.afterStatus) }}</span>
                </p>
                <a v-if="item.attachmentUrl" :href="item.attachmentUrl" target="_blank" class="timeline-card__attach">
                  查看附件
                </a>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <div v-if="pagination.total > pagination.pageSize" class="pagination-wrap">
            <el-pagination
              v-model:current-page="pagination.page"
              :total="pagination.total"
              :page-size="pagination.pageSize"
              layout="prev, pager, next"
              small
              @current-change="fetchChanges"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Document } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import StatusTag from '@shared-web/components/StatusTag.vue';
import { usePagination } from '@shared-web/composables/usePagination';
import { getStatus, listStatusChanges } from '@/api/status';
import { StatusChangeType } from '@shared-web/types';
import type { StatusChange, StudentStatus } from '@shared-web/types';
import type { StudentStatusInfo } from '@/api/status';

const router = useRouter();
const loading = ref(false);
const statusInfo = ref<StudentStatusInfo | null>(null);
const changes = ref<StatusChange[]>([]);
const { pagination } = usePagination(10);

function goApply(type: StatusChangeType): void {
  router.push(`/status/apply/${type}`);
}

function formatDate(d?: string): string {
  return d ? new Date(d).toLocaleDateString() : '-';
}

function formatDateTime(d?: string): string {
  return d ? new Date(d).toLocaleString() : '-';
}

function typeLabel(type: StatusChangeType): string {
  const map: Record<StatusChangeType, string> = {
    SUSPEND: '休学申请',
    RESUME: '复学申请',
    TRANSFER_MAJOR: '转专业申请',
    DROP_OUT: '退学申请',
  };
  return map[type] || type;
}

function statusLabel(s: StudentStatus): string {
  const map: Record<StudentStatus, string> = {
    NORMAL: '在校',
    SUSPENDED: '休学',
    RESUMED: '复学',
    DROPPED: '退学',
    HELD_BACK: '留级',
    GRADUATED: '毕业',
  };
  return map[s] || s;
}

function timelineType(status: string): 'primary' | 'success' | 'danger' | 'warning' {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'warning';
}

async function fetchStatus(): Promise<void> {
  try {
    statusInfo.value = await getStatus();
  } catch {
    // ignore
  }
}

async function fetchChanges(): Promise<void> {
  loading.value = true;
  try {
    const data = await listStatusChanges(pagination.page, pagination.pageSize);
    changes.value = data.list;
    pagination.total = data.total;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchStatus();
  fetchChanges();
});
</script>

<style scoped lang="scss">
.status-card {
  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 12px;
  }
  &__body {
    h3 {
      margin: 0 0 8px;
      font-size: 18px;
    }
    p {
      margin: 4px 0;
      color: var(--el-text-color-secondary);
      font-size: 13px;
    }
  }
  &__tag {
    margin: 12px 0;
  }
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
  }
}
.timeline-card {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  &__title {
    font-weight: 600;
  }
  &__reason {
    margin: 4px 0;
    color: var(--el-text-color-regular);
    font-size: 13px;
  }
  &__status {
    margin: 4px 0;
    color: var(--el-text-color-secondary);
    font-size: 12px;
  }
  &__attach {
    font-size: 12px;
    color: var(--el-color-primary);
  }
}
.pagination-wrap {
  margin-top: 16px;
  text-align: right;
}
</style>
