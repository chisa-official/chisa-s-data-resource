<template>
  <div class="status-apply-page">
    <PageHeader :title="title" subtitle="填写完整信息后提交，等待审批" />

    <el-card>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" style="max-width: 640px">
        <el-form-item label="异动类型">
          <el-tag>{{ typeLabel }}</el-tag>
        </el-form-item>

        <el-form-item v-if="type === 'TRANSFER_MAJOR'" label="目标专业" prop="targetMajorId">
          <el-select v-model="form.targetMajorId" placeholder="请选择目标专业" filterable style="width: 100%">
            <el-option v-for="m in majors" :key="m.id" :label="`${m.name} (${m.code})`" :value="m.id" />
          </el-select>
        </el-form-item>

        <el-form-item label="申请原因" prop="reason">
          <el-input
            v-model="form.reason"
            type="textarea"
            :rows="5"
            :placeholder="reasonPlaceholder"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="附件材料" v-if="needAttachment">
          <el-upload
            :auto-upload="false"
            :limit="1"
            :on-change="onFileChange"
            :on-remove="onFileRemove"
            accept=".jpg,.jpeg,.png,.pdf"
          >
            <el-button type="primary" plain>选择文件</el-button>
            <template #tip>
              <div class="el-form-item__tip">支持 jpg/png/pdf，最大 5MB{{ attachmentTip }}</div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="onSubmit">提交申请</el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules, type UploadFile } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { applyStatusChange, getMajors } from '@/api/status';
import type { Major, StatusChangeType } from '@shared-web/types';

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const majors = ref<Major[]>([]);
const attachment = ref<File | null>(null);

const type = computed<StatusChangeType>(() => route.params.type as StatusChangeType);

const title = computed(() => {
  const map: Record<StatusChangeType, string> = {
    SUSPEND: '休学申请',
    RESUME: '复学申请',
    TRANSFER_MAJOR: '转专业申请',
    DROP_OUT: '退学申请',
  };
  return map[type.value] || '学籍异动申请';
});

const typeLabel = computed(() => title.value);

const needAttachment = computed(() => type.value === 'SUSPEND');

const attachmentTip = computed(() => {
  return type.value === 'SUSPEND' ? '（病休需上传医院证明）' : '';
});

const reasonPlaceholder = computed(() => {
  const map: Record<StatusChangeType, string> = {
    SUSPEND: '请详细说明休学原因（身体状况、家庭情况等），至少 10 字',
    RESUME: '请说明复学原因及身体/情况恢复情况，至少 10 字',
    TRANSFER_MAJOR: '请说明转专业原因及学习规划，至少 10 字',
    DROP_OUT: '请说明退学原因，至少 10 字',
  };
  return map[type.value];
});

const form = reactive({
  reason: '',
  targetMajorId: '' as string,
});

const rules: FormRules = {
  reason: [
    { required: true, message: '请填写申请原因', trigger: 'blur' },
    { min: 10, max: 500, message: '原因说明 10-500 字', trigger: 'blur' },
  ],
  targetMajorId: [
    {
      validator: (_rule, value, callback) => {
        if (type.value === 'TRANSFER_MAJOR' && !value) {
          callback(new Error('请选择目标专业'));
        } else {
          callback();
        }
      },
      trigger: 'change',
    },
  ],
};

function onFileChange(file: UploadFile): void {
  if (file.raw) {
    if (file.raw.size > 5 * 1024 * 1024) {
      ElMessage.error('文件大小不能超过 5MB');
      return;
    }
    attachment.value = file.raw;
  }
}

function onFileRemove(): void {
  attachment.value = null;
}

async function fetchMajors(): Promise<void> {
  try {
    majors.value = await getMajors();
  } catch {
    // 接口异常时留空，用户可看到无可用专业提示
  }
}

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  submitting.value = true;
  try {
    await applyStatusChange(
      {
        type: type.value,
        reason: form.reason,
        targetMajorId: type.value === 'TRANSFER_MAJOR' ? form.targetMajorId : undefined,
      },
      attachment.value || undefined,
    );
    ElMessage.success('异动申请已提交，请等待审批');
    router.push('/status');
  } catch {
    // 错误提示由拦截器处理
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  if (type.value === 'TRANSFER_MAJOR') {
    fetchMajors();
  }
});
</script>

<style scoped lang="scss">
.el-form-item__tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}
</style>
