<template>
  <div class="rule-page">
    <PageHeader title="预警规则配置" subtitle="设置旷课预警阈值与通知角色" />

    <el-card v-loading="loading">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px" style="max-width: 560px">
        <el-form-item label="旷课预警阈值" prop="threshold">
          <el-input-number v-model="form.threshold" :min="1" :max="50" style="width: 200px" />
          <span class="tip">学生旷课达到此次数将进入预警名单</span>
        </el-form-item>
        <el-form-item label="通知角色" prop="notifyRole">
          <el-select v-model="form.notifyRole" placeholder="选择通知角色" style="width: 200px">
            <el-option label="辅导员" value="COUNSELOR" />
            <el-option label="学工老师" value="STUDENT_AFFAIRS" />
            <el-option label="超级管理员" value="SUPER_ADMIN" />
          </el-select>
          <span class="tip">预警信息将通知该角色</span>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="onSubmit">保存规则</el-button>
          <el-button @click="loadData">重置</el-button>
        </el-form-item>
      </el-form>

      <el-alert
        title="规则说明"
        type="info"
        :closable="false"
        show-icon
        style="margin-top: 20px; max-width: 560px"
      >
        <template #default>
          预警规则用于考勤预警模块。当学生旷课次数达到阈值时，系统将其列入预警名单。
          后续可对接定时任务（node-cron）自动扫描并推送站内消息给指定角色。
        </template>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, type FormInstance } from 'element-plus';
import PageHeader from '@shared-web/components/PageHeader.vue';
import { getAttendanceRule, updateAttendanceRule } from '@/api/attendance';

const loading = ref(false);
const submitting = ref(false);
const formRef = ref<FormInstance>();

const form = reactive({
  threshold: 3,
  notifyRole: 'COUNSELOR',
});

const rules = {
  threshold: [{ required: true, message: '请输入预警阈值', trigger: 'blur' }],
  notifyRole: [{ required: true, message: '请选择通知角色', trigger: 'change' }],
};

async function loadData(): Promise<void> {
  loading.value = true;
  try {
    const rule = await getAttendanceRule();
    form.threshold = rule.threshold;
    form.notifyRole = rule.notifyRole;
  } catch { /* ignore */ } finally {
    loading.value = false;
  }
}

async function onSubmit(): Promise<void> {
  await formRef.value?.validate();
  submitting.value = true;
  try {
    await updateAttendanceRule({ ...form });
    ElMessage.success('规则已保存');
  } catch { /* ignore */ } finally {
    submitting.value = false;
  }
}

onMounted(loadData);
</script>

<style scoped lang="scss">
.rule-page {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
}
.tip {
  margin-left: 12px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
