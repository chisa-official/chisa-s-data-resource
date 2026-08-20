<template>
  <div class="complaint-page">
    <PageHeader title="意见反馈" subtitle="提交建议或投诉，查看回复" />

    <el-row :gutter="20">
      <el-col :span="10">
        <el-card>
          <template #header><span>提交反馈</span></template>
          <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
            <el-form-item label="反馈类型" prop="type">
              <el-radio-group v-model="form.type">
                <el-radio :value="FeedbackType.SUGGESTION">建议</el-radio>
                <el-radio :value="FeedbackType.COMPLAINT">投诉</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="反馈内容" prop="content">
              <el-input
                v-model="form.content"
                type="textarea"
                :rows="6"
                placeholder="请详细描述您的建议或投诉内容"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="onSubmit">提交反馈</el-button>
              <el-button @click="onReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card>
          <template #header><span>我的反馈记录</span></template>
          <div v-loading="loading">
            <div v-for="item in records" :key="item.id" class="feedback-item">
              <div class="feedback-header">
                <el-tag :type="item.type === 'SUGGESTION' ? 'primary' : 'warning'" size="small">
                  {{ item.type === 'SUGGESTION' ? '建议' : '投诉' }}
                </el-tag>
                <StatusTag :status="item.status" />
                <span class="feedback-time">{{ formatDateTime(item.createdAt) }}</span>
              </div>
              <div class="feedback-content">{{ item.content }}</div>
              <div v-if="item.reply" class="feedback-reply">
                <el-divider content-position="left">回复</el-divider>
                <div class="reply-content">{{ item.reply }}</div>
              </div>
            </div>
            <el-empty v-if="!loading && !records.length" description="暂无反馈记录" />
          </div>
          <div v-if="pagination.total > pagination.pageSize" class="pagination-wrap">
            <el-pagination
              v-model:current-page="pagination.page"
              :total="pagination.total"
              :page-size="pagination.pageSize"
              layout="prev, pager, next"
              small
              @current-change="fetchRecords"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import StatusTag from '@shared-web/components/StatusTag.vue';
import { usePagination } from '@shared-web/composables/usePagination';
import { createFeedback, getFeedbackList } from '@/api/feedback';
import { FeedbackType } from '@shared-web/types';
import type { Feedback } from '@shared-web/types';
import { formatDateTime } from '@shared-web/utils/format';

const formRef = ref<FormInstance>();
const submitting = ref(false);
const loading = ref(false);
const records = ref<Feedback[]>([]);
const { pagination } = usePagination(10);

const form = reactive({
  type: FeedbackType.SUGGESTION,
  content: '',
});

const rules: FormRules = {
  type: [{ required: true, message: '请选择反馈类型', trigger: 'change' }],
  content: [
    { required: true, message: '请填写反馈内容', trigger: 'blur' },
    { max: 500, message: '内容不超过 500 字', trigger: 'blur' },
  ],
};

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await createFeedback({ type: form.type, content: form.content });
    ElMessage.success('反馈提交成功');
    onReset();
    fetchRecords();
  } catch {
    // ignore
  } finally {
    submitting.value = false;
  }
}

function onReset(): void {
  formRef.value?.resetFields();
  form.type = FeedbackType.SUGGESTION;
  form.content = '';
}

async function fetchRecords(): Promise<void> {
  loading.value = true;
  try {
    const data = await getFeedbackList(pagination.page, pagination.pageSize);
    records.value = data.list;
    pagination.total = data.total;
  } catch {
    // ignore
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchRecords();
});
</script>

<style scoped lang="scss">
.feedback-item {
  padding: 16px 0;
  border-bottom: 1px solid #ebeef5;
  &:last-child {
    border-bottom: none;
  }
}
.feedback-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}
.feedback-time {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.feedback-content {
  color: var(--el-text-color-primary);
  line-height: 1.6;
}
.feedback-reply {
  .reply-content {
    color: var(--el-text-color-regular);
    background: var(--el-fill-color-light);
    padding: 12px;
    border-radius: 4px;
    line-height: 1.6;
  }
}
.pagination-wrap {
  margin-top: 16px;
  text-align: right;
}
</style>
