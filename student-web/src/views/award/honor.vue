<template>
  <div class="honor-page">
    <PageHeader title="评优申请" subtitle="申请荣誉称号，提交后等待学校评审" />

    <el-row :gutter="20">
      <el-col :span="10">
        <el-card>
          <template #header>
            <span>提交评优申请</span>
          </template>
          <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
            <el-form-item label="项目名称" prop="name">
              <el-input v-model="form.name" placeholder="如：三好学生、优秀学生干部" maxlength="50" show-word-limit />
            </el-form-item>

            <el-form-item label="金额" prop="amount">
              <el-input-number
                v-model="form.amount"
                :min="0"
                :precision="2"
                :step="100"
                placeholder="选填"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>

            <el-form-item label="学期" prop="semester">
              <el-input v-model="form.semester" placeholder="如：2025-2026-1" />
            </el-form-item>

            <el-form-item label="材料附件">
              <FileUploader
                v-model="attachments"
                bizType="award_apply"
                :max-count="5"
                :max-size-m-b="10"
                tip="支持图片/PDF/Word 等，最多 5 个，单个不超过 10MB"
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
            <span>我的申请记录</span>
          </template>
          <el-table :data="records" v-loading="loading" size="small" border style="width: 100%">
            <el-table-column label="项目名称" prop="name" min-width="150" show-overflow-tooltip />
            <el-table-column label="金额" width="100" align="center">
              <template #default="{ row }">{{ row.amount != null ? formatMoney(row.amount) : '-' }}</template>
            </el-table-column>
            <el-table-column label="学期" prop="semester" width="120" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }"><StatusTag :status="row.status" /></template>
            </el-table-column>
            <el-table-column label="评审结果" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.result || '-' }}</template>
            </el-table-column>
            <el-table-column label="申请时间" width="110">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && !records.length" description="暂无申请记录" />
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
import { getMyAwards, applyAward } from '@/api/award';
import { AwardType } from '@shared-web/types';
import type { Award } from '@shared-web/types';
import { formatDate, formatMoney } from '@shared-web/utils/format';

const PAGE_TYPE = AwardType.HONOR;

const formRef = ref<FormInstance>();
const submitting = ref(false);
const loading = ref(false);
const records = ref<Award[]>([]);
const attachments = ref<Array<{ id: string; filename: string; url: string; size?: number }>>([]);
const { pagination } = usePagination(10);

const form = reactive({
  name: '',
  amount: undefined as number | undefined,
  semester: '2025-2026-1',
});

const rules: FormRules = {
  name: [{ required: true, message: '请填写项目名称', trigger: 'blur' }],
  semester: [{ required: true, message: '请填写学期', trigger: 'blur' }],
};

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await applyAward({
      type: PAGE_TYPE,
      name: form.name,
      amount: form.amount,
      semester: form.semester,
      attachments: attachments.value.map((f) => f.url),
    });
    ElMessage.success('评优申请已提交');
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
  form.name = '';
  form.amount = undefined;
  form.semester = '2025-2026-1';
  attachments.value = [];
}

async function fetchRecords(): Promise<void> {
  loading.value = true;
  try {
    const data = await getMyAwards(PAGE_TYPE, pagination.page, pagination.pageSize);
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
