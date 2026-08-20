<template>
  <div class="feedback-page">
    <PageHeader title="反馈管理" subtitle="查看与回复学生意见/投诉反馈" />

    <el-card>
      <div class="search-bar">
        <el-select v-model="query.type" placeholder="反馈类型" clearable style="width: 130px" @change="onSearch">
          <el-option label="建议" value="SUGGESTION" />
          <el-option label="投诉" value="COMPLAINT" />
        </el-select>
        <el-select v-model="query.status" placeholder="处理状态" clearable style="width: 130px" @change="onSearch">
          <el-option label="待处理" value="PENDING" />
          <el-option label="已回复" value="APPROVED" />
        </el-select>
        <el-input v-model="query.studentNo" placeholder="学号" clearable style="width: 130px" @keyup.enter="onSearch" />
        <el-input v-model="query.studentName" placeholder="姓名" clearable style="width: 120px" @keyup.enter="onSearch" />
        <el-button type="primary" :icon="Search" @click="onSearch">查询</el-button>
        <el-button :icon="Refresh" @click="onReset">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="list" border row-key="id">
        <el-table-column label="学生" min-width="150">
          <template #default="{ row }">{{ row.student?.studentNo }} - {{ row.student?.name }}</template>
        </el-table-column>
        <el-table-column label="院系/班级" min-width="160">
          <template #default="{ row }">
            {{ row.student?.department?.name || '—' }} / {{ row.student?.class?.name || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'SUGGESTION' ? 'success' : 'danger'" size="small">{{ row.type === 'SUGGESTION' ? '建议' : '投诉' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="反馈内容" prop="content" min-width="240" show-overflow-tooltip />
        <el-table-column label="回复" prop="reply" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'PENDING' ? 'warning' : 'success'" size="small">{{ row.status === 'PENDING' ? '待处理' : '已回复' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="提交时间" width="160">
          <template #default="{ row }">{{ row.createdAt?.replace('T', ' ').slice(0, 16) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="onReply(row)">回复</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="loadData"
          @size-change="onSizeChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="replyVisible" title="回复反馈" width="560px">
      <div v-if="current" class="reply-detail">
        <div class="detail-row"><span class="label">学生：</span>{{ current.student?.studentNo }} - {{ current.student?.name }}</div>
        <div class="detail-row"><span class="label">类型：</span>{{ current.type === 'SUGGESTION' ? '建议' : '投诉' }}</div>
        <div class="detail-row"><span class="label">反馈内容：</span></div>
        <div class="detail-content">{{ current.content }}</div>
        <div v-if="current.reply" class="detail-row">
          <span class="label">历史回复：</span>{{ current.reply }}
        </div>
      </div>
      <el-divider />
      <el-form :model="replyForm" label-width="90px">
        <el-form-item label="回复内容">
          <el-input v-model="replyForm.reply" type="textarea" :rows="4" placeholder="请输入回复内容" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmitReply">确认回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh } from '@element-plus/icons-vue';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { listFeedbacks, replyFeedback, type FeedbackResult } from '@/api/feedback';
import { FeedbackType, ApplyStatus } from '@shared-web/types';

const loading = ref(false);
const submitting = ref(false);
const list = ref<FeedbackResult[]>([]);
const replyVisible = ref(false);
const current = ref<FeedbackResult | null>(null);

const pagination = reactive({ page: 1, pageSize: 10, total: 0 });
const query = reactive({
  type: undefined as FeedbackType | undefined,
  status: undefined as ApplyStatus | undefined,
  studentNo: '',
  studentName: '',
});

const replyForm = reactive({ reply: '' });

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const res = await listFeedbacks({
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: query.type,
      status: query.status,
      studentNo: query.studentNo || undefined,
      studentName: query.studentName || undefined,
    });
    list.value = res.list;
    pagination.total = res.total;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  pagination.page = 1;
  loadData();
}

function onReset(): void {
  query.type = undefined;
  query.status = undefined;
  query.studentNo = '';
  query.studentName = '';
  pagination.page = 1;
  loadData();
}

function onSizeChange(size: number): void {
  pagination.pageSize = size;
  pagination.page = 1;
  loadData();
}

function onReply(row: FeedbackResult): void {
  current.value = row;
  replyForm.reply = row.reply || '';
  replyVisible.value = true;
}

async function onSubmitReply(): Promise<void> {
  if (!current.value) return;
  if (!replyForm.reply.trim()) {
    ElMessage.warning('回复内容不能为空');
    return;
  }
  submitting.value = true;
  try {
    await replyFeedback(current.value.id, replyForm.reply);
    ElMessage.success('回复成功');
    replyVisible.value = false;
    await loadData();
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.feedback-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.reply-detail {
  .detail-row {
    margin-bottom: 8px;
    font-size: 14px;
    .label {
      color: var(--el-text-color-secondary);
      margin-right: 4px;
    }
  }
  .detail-content {
    background: var(--el-fill-color-light);
    padding: 10px 12px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 12px;
  }
}
</style>
