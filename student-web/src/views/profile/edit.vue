<template>
  <div class="info-edit-page">
    <PageHeader title="信息修改申请" subtitle="敏感信息变更需提交申请，审批通过后生效" />

    <el-row :gutter="20">
      <el-col :span="14">
        <el-card>
          <template #header>
            <span>提交修改申请</span>
          </template>
          <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
            <el-form-item label="修改字段" prop="field">
              <el-select v-model="form.field" placeholder="请选择要修改的字段" style="width: 100%" @change="onFieldChange">
                <el-option label="手机号" value="phone" />
                <el-option label="邮箱" value="email" />
                <el-option label="籍贯" value="hometown" />
                <el-option label="家庭住址" value="address" />
              </el-select>
            </el-form-item>

            <el-form-item label="当前值">
              <el-input :model-value="currentValue" disabled />
            </el-form-item>

            <el-form-item label="新值" prop="newValue">
              <el-input v-model="form.newValue" :placeholder="newValuePlaceholder" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="submitting" @click="onSubmit">提交申请</el-button>
              <el-button @click="router.back()">返回</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card>
          <template #header>
            <span>申请记录</span>
          </template>
          <el-table :data="records" v-loading="loading" size="small" style="width: 100%">
            <el-table-column label="字段" prop="field" width="80">
              <template #default="{ row }">{{ fieldLabel(row.field) }}</template>
            </el-table-column>
            <el-table-column label="新值" prop="newValue" show-overflow-tooltip />
            <el-table-column label="状态" width="90">
              <template #default="{ row }"><StatusTag :status="row.status" /></template>
            </el-table-column>
            <el-table-column label="申请时间" width="110">
              <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :total="pagination.total"
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
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import StatusTag from '@shared-web/components/StatusTag.vue';
import { useUserStore } from '@/stores/user';
import { submitInfoEdit, listInfoEdits, type InfoEditApply } from '@/api/profile';
import { usePagination } from '@shared-web/composables/usePagination';

const router = useRouter();
const userStore = useUserStore();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const loading = ref(false);
const records = ref<InfoEditApply[]>([]);
const { pagination } = usePagination(5);

const form = reactive({
  field: 'phone' as 'phone' | 'email' | 'hometown' | 'address',
  newValue: '',
});

const currentValue = computed(() => {
  const info = userStore.studentInfo;
  if (!info) return '-';
  const map: Record<string, any> = {
    phone: info.phone,
    email: info.email,
    hometown: info.hometown,
    address: info.address,
  };
  return map[form.field] || '-';
});

const newValuePlaceholder = computed(() => {
  const map: Record<string, string> = {
    phone: '请输入新手机号',
    email: '请输入新邮箱',
    hometown: '请输入新籍贯',
    address: '请输入新家庭住址',
  };
  return map[form.field];
});

const rules: FormRules = {
  field: [{ required: true, message: '请选择修改字段', trigger: 'change' }],
  newValue: [
    { required: true, message: '请输入新值', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (form.field === 'phone' && !/^1[3-9]\d{9}$/.test(value)) {
          callback(new Error('手机号格式错误'));
        } else if (form.field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          callback(new Error('邮箱格式错误'));
        } else {
          callback();
        }
      },
      trigger: 'blur',
    },
  ],
};

function onFieldChange(): void {
  form.newValue = '';
}

function fieldLabel(field: string): string {
  const map: Record<string, string> = { phone: '手机号', email: '邮箱', hometown: '籍贯', address: '住址' };
  return map[field] || field;
}

function formatDate(dateStr: string): string {
  return dateStr ? new Date(dateStr).toLocaleDateString() : '-';
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await submitInfoEdit({ field: form.field, newValue: form.newValue });
    ElMessage.success('申请已提交，等待审批');
    form.newValue = '';
    fetchRecords();
  } catch {
    // 错误提示由拦截器处理
  } finally {
    submitting.value = false;
  }
}

async function fetchRecords(): Promise<void> {
  loading.value = true;
  try {
    const data = await listInfoEdits(pagination.page, pagination.pageSize);
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
  margin-top: 12px;
  text-align: right;
}
</style>
