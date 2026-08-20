<template>
  <div class="repair-page">
    <PageHeader title="报修" subtitle="提交宿舍/教室报修，跟踪处理进度" />

    <el-row :gutter="20">
      <el-col :span="10">
        <el-card>
          <template #header><span>提交报修</span></template>
          <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
            <el-form-item label="报修类型" prop="type">
              <el-radio-group v-model="form.type">
                <el-radio :value="RepairType.DORM">宿舍</el-radio>
                <el-radio :value="RepairType.CLASSROOM">教室</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="位置" prop="location">
              <el-input v-model="form.location" placeholder="如：3号楼301室" maxlength="100" />
            </el-form-item>
            <el-form-item label="问题描述" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="4"
                placeholder="请详细描述报修问题"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>
            <el-form-item label="图片">
              <FileUploader
                v-model="images"
                bizType="repair_image"
                accept="image/png,image/jpeg"
                :max-count="5"
                :max-size-m-b="5"
                list-type="picture-card"
                tip="上传现场照片，最多5张，单张不超过5MB"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="onSubmit">提交报修</el-button>
              <el-button @click="onReset">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card>
          <template #header><span>我的报修记录</span></template>
          <el-table :data="records" v-loading="loading" size="small" border style="width: 100%">
            <el-table-column label="类型" width="70">
              <template #default="{ row }">
                <el-tag size="small" :type="row.type === 'DORM' ? 'primary' : 'success'">
                  {{ row.type === 'DORM' ? '宿舍' : '教室' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="位置" prop="location" width="120" show-overflow-tooltip />
            <el-table-column label="描述" prop="description" min-width="150" show-overflow-tooltip />
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="repairStatusTag(row.status)" size="small">{{ repairStatusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="处理结果" prop="result" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ row.result || '—' }}</template>
            </el-table-column>
            <el-table-column label="提交时间" width="110">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!loading && !records.length" description="暂无报修记录" />
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
import FileUploader from '@shared-web/components/FileUploader.vue';
import { usePagination } from '@shared-web/composables/usePagination';
import { createRepair, getRepairList } from '@/api/feedback';
import { RepairType, RepairStatus } from '@shared-web/types';
import type { Repair } from '@shared-web/types';
import { formatDate } from '@shared-web/utils/format';

const formRef = ref<FormInstance>();
const submitting = ref(false);
const loading = ref(false);
const records = ref<Repair[]>([]);
const images = ref<Array<{ id: string; filename: string; url: string; size?: number }>>([]);
const { pagination } = usePagination(10);

const form = reactive({
  type: RepairType.DORM,
  location: '',
  description: '',
});

const rules: FormRules = {
  type: [{ required: true, message: '请选择报修类型', trigger: 'change' }],
  location: [
    { required: true, message: '请填写报修位置', trigger: 'blur' },
    { max: 100, message: '位置不超过 100 字', trigger: 'blur' },
  ],
  description: [
    { required: true, message: '请描述报修问题', trigger: 'blur' },
    { max: 500, message: '描述不超过 500 字', trigger: 'blur' },
  ],
};

function repairStatusLabel(status: RepairStatus): string {
  const map: Record<string, string> = {
    PENDING: '待处理',
    PROCESSING: '处理中',
    DONE: '已完成',
  };
  return map[status] || status;
}

function repairStatusTag(status: RepairStatus): 'warning' | 'primary' | 'success' {
  const map: Record<string, 'warning' | 'primary' | 'success'> = {
    PENDING: 'warning',
    PROCESSING: 'primary',
    DONE: 'success',
  };
  return map[status] || 'info' as any;
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await createRepair({
      type: form.type,
      location: form.location,
      description: form.description,
      images: images.value.map((img) => img.url),
    });
    ElMessage.success('报修提交成功');
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
  form.type = RepairType.DORM;
  form.location = '';
  form.description = '';
  images.value = [];
}

async function fetchRecords(): Promise<void> {
  loading.value = true;
  try {
    const data = await getRepairList(pagination.page, pagination.pageSize);
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
