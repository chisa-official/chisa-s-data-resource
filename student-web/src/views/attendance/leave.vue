<template>
  <div class="leave-page">
    <PageHeader title="请假申请" subtitle="提交事假/病假申请，等待审批" />

    <el-row :gutter="20">
      <el-col :span="10">
        <el-card>
          <template #header>
            <span>提交请假申请</span>
          </template>
          <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
            <el-form-item label="请假类型" prop="type">
              <el-radio-group v-model="form.type">
                <el-radio :value="LeaveType.PERSONAL">事假</el-radio>
                <el-radio :value="LeaveType.SICK">病假</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="开始日期" prop="startDate">
              <el-date-picker
                v-model="form.startDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择开始日期"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="结束日期" prop="endDate">
              <el-date-picker
                v-model="form.endDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择结束日期"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="请假原因" prop="reason">
              <el-input
                v-model="form.reason"
                type="textarea"
                :rows="4"
                placeholder="请详细说明请假原因"
                maxlength="300"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="病假证明">
              <FileUploader
                v-model="attachments"
                bizType="leave_proof"
                :max-count="1"
                :max-size-m-b="10"
                tip="病假请上传医院证明，单个文件不超过 10MB"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="onSubmit">提交申请</el-button>
              <el-button @click="onReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card>
          <template #header>
            <span>请假记录</span>
          </template>
          <el-table :data="records" v-loading="loading" size="small" border style="width: 100%">
            <el-table-column label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="leaveTag(row.type)" size="small">{{ leaveLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="起止时间" min-width="180">
              <template #default="{ row }">{{ formatDate(row.startDate) }} ~ {{ formatDate(row.endDate) }}</template>
            </el-table-column>
            <el-table-column label="原因" prop="reason" min-width="150" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="{ row }"><StatusTag :status="row.status" /></template>
            </el-table-column>
            <el-table-column label="审批进度" width="90" align="center">
              <template #default="{ row }">第 {{ row.currentStep }} 步</template>
            </el-table-column>
            <el-table-column label="申请时间" width="110">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && !records.length" description="暂无请假记录" />
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
import FileUploader from '@shared-web/components/FileUploader.vue';
import { usePagination } from '@shared-web/composables/usePagination';
import { applyLeave, getLeaveList } from '@/api/attendance';
import { LeaveType } from '@shared-web/types';
import type { LeaveApply, LeaveType as LT } from '@shared-web/types';
import { formatDate, dayjs } from '@shared-web/utils/format';

const formRef = ref<FormInstance>();
const submitting = ref(false);
const loading = ref(false);
const records = ref<LeaveApply[]>([]);
const attachments = ref<Array<{ id: string; filename: string; url: string; size?: number }>>([]);
const { pagination } = usePagination(10);

const form = reactive({
  type: LeaveType.PERSONAL,
  startDate: '',
  endDate: '',
  reason: '',
});

const rules: FormRules = {
  type: [{ required: true, message: '请选择请假类型', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  endDate: [
    {
      required: true,
      trigger: 'change',
      validator: (_rule, value, callback) => {
        if (!value) {
          callback(new Error('请选择结束日期'));
          return;
        }
        if (form.startDate && dayjs(value as string).isBefore(dayjs(form.startDate), 'day')) {
          callback(new Error('结束日期需晚于开始日期'));
          return;
        }
        callback();
      },
    },
  ],
  reason: [
    { required: true, message: '请填写请假原因', trigger: 'blur' },
    { max: 300, message: '原因不超过 300 字', trigger: 'blur' },
  ],
};

function leaveLabel(type: LT): string {
  return type === LeaveType.SICK ? '病假' : '事假';
}

function leaveTag(type: LT): 'primary' | 'warning' | 'info' {
  return type === LeaveType.SICK ? 'warning' : 'primary';
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await applyLeave({
      type: form.type,
      startDate: dayjs(form.startDate).startOf('day').toISOString(),
      endDate: dayjs(form.endDate).endOf('day').toISOString(),
      reason: form.reason,
      attachmentUrl: attachments.value[0]?.url,
    });
    ElMessage.success('请假申请已提交');
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
  form.type = LeaveType.PERSONAL;
  form.startDate = '';
  form.endDate = '';
  form.reason = '';
  attachments.value = [];
}

async function fetchRecords(): Promise<void> {
  loading.value = true;
  try {
    const data = await getLeaveList(pagination.page, pagination.pageSize);
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
.pagination-wrap {
  margin-top: 16px;
  text-align: right;
}
</style>
