<template>
  <div class="certificate-page">
    <PageHeader title="证明申请" subtitle="申请在校证明或学籍证明，生成 PDF 可下载" />

    <el-row :gutter="20">
      <el-col :span="10">
        <el-card>
          <template #header>
            <span>提交证明申请</span>
          </template>
          <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
            <el-form-item label="证明类型" prop="type">
              <el-radio-group v-model="form.type">
                <el-radio :value="CertificateType.ENROLLMENT">在校证明</el-radio>
                <el-radio :value="CertificateType.STATUS">学籍证明</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="用途" prop="purpose">
              <el-input
                v-model="form.purpose"
                type="textarea"
                :rows="3"
                placeholder="请说明证明用途，如：办理签证、求职、参赛报名等"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="onSubmit">生成证明</el-button>
              <el-button @click="router.back()">返回</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="14">
        <el-card>
          <template #header>
            <span>历史申请记录</span>
          </template>
          <el-table :data="records" v-loading="loading" size="small" style="width: 100%">
            <el-table-column label="类型" width="100">
              <template #default="{ row }">{{ typeLabel(row.type) }}</template>
            </el-table-column>
            <el-table-column label="用途" prop="purpose" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="{ row }"><StatusTag :status="row.status" /></template>
            </el-table-column>
            <el-table-column label="申请时间" width="120">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button
                  v-if="row.fileUrl"
                  type="primary"
                  link
                  size="small"
                  @click="onDownload(row.id)"
                >
                  下载
                </el-button>
                <span v-else class="text-muted">未生成</span>
              </template>
            </el-table-column>
          </el-table>
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
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import StatusTag from '@shared-web/components/StatusTag.vue';
import { usePagination } from '@shared-web/composables/usePagination';
import { applyCertificate, listCertificates, getCertificateDownloadUrl, type CertificateApply } from '@/api/status';
import { CertificateType } from '@shared-web/types';
import { downloadFile } from '@shared-web/utils/download';

const router = useRouter();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const loading = ref(false);
const records = ref<CertificateApply[]>([]);
const { pagination } = usePagination(10);

const form = reactive({
  type: CertificateType.ENROLLMENT,
  purpose: '',
});

const rules: FormRules = {
  type: [{ required: true, message: '请选择证明类型', trigger: 'change' }],
  purpose: [
    { required: true, message: '请填写用途', trigger: 'blur' },
    { max: 200, message: '用途不超过 200 字', trigger: 'blur' },
  ],
};

function typeLabel(type: string): string {
  return type === 'ENROLLMENT' ? '在校证明' : '学籍证明';
}

function formatDate(d: string): string {
  return d ? new Date(d).toLocaleDateString() : '-';
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await applyCertificate(form);
    ElMessage.success('证明已生成，可点击下载');
    form.purpose = '';
    fetchRecords();
  } catch {
    // ignore
  } finally {
    submitting.value = false;
  }
}

async function onDownload(id: string): Promise<void> {
  try {
    const url = getCertificateDownloadUrl(id);
    await downloadFile(url, undefined, '证明.pdf');
  } catch {
    // ignore
  }
}

async function fetchRecords(): Promise<void> {
  loading.value = true;
  try {
    const data = await listCertificates(pagination.page, pagination.pageSize);
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
.text-muted {
  color: var(--el-text-color-placeholder);
  font-size: 12px;
}
</style>
