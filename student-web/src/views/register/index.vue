<template>
  <div class="register-page">
    <div class="register-box">
      <div class="register-box__header">
        <h1>学生账号注册</h1>
        <p>高校学生管理系统 - 学生端</p>
      </div>

      <el-alert
        type="info"
        :closable="false"
        show-icon
        class="register-box__alert"
        title="注册提示"
        description="注册成功后账号将默认处于「待分配」状态，请等待管理员为您分配院系/班级后，即可使用完整功能。"
      />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="default"
        @submit.prevent="onSubmit"
      >
        <el-form-item label="学号" prop="studentNo">
          <el-input v-model="form.studentNo" placeholder="请输入 8-12 位数字学号" :prefix-icon="User" maxlength="12" />
        </el-form-item>

        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入真实姓名" :prefix-icon="UserFilled" maxlength="50" />
        </el-form-item>

        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="form.gender">
            <el-radio label="MALE">男</el-radio>
            <el-radio label="FEMALE">女</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="选填，便于联系" :prefix-icon="Phone" maxlength="11" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="选填" :prefix-icon="Message" maxlength="100" />
        </el-form-item>

        <el-form-item label="设置密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            placeholder="8-20 位，包含大小写字母、数字、特殊字符中至少 3 种"
            :prefix-icon="Lock"
            maxlength="20"
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            placeholder="请再次输入密码"
            :prefix-icon="Lock"
            maxlength="20"
            @keyup.enter="onSubmit"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="onSubmit">注 册</el-button>
        </el-form-item>
      </el-form>

      <div class="register-box__footer">
        <p>
          已有账号？
          <router-link to="/login" class="register-box__link">立即登录</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { User, UserFilled, Lock, Phone, Message } from '@element-plus/icons-vue';
import { register } from '@/api/auth';
import {
  studentNoRule,
  phoneRule,
  emailRule,
  strongPasswordRule,
  required,
} from '@shared-web/utils/validate';

const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  studentNo: '',
  name: '',
  gender: 'MALE' as 'MALE' | 'FEMALE',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const rules: FormRules = {
  studentNo: studentNoRule,
  name: [required('请输入姓名')],
  gender: [required('请选择性别')],
  phone: phoneRule,
  email: emailRule,
  password: strongPasswordRule,
  confirmPassword: [
    required('请再次输入密码'),
    {
      validator: (_r, value, cb) => {
        if (!value) return cb(new Error('请再次输入密码'));
        if (value !== form.password) return cb(new Error('两次输入的密码不一致'));
        cb();
      },
      trigger: 'blur',
    },
  ],
};

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    await register({
      studentNo: form.studentNo,
      name: form.name,
      gender: form.gender,
      phone: form.phone || undefined,
      email: form.email || undefined,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });
    ElMessage.success('注册成功，即将跳转登录页');
    setTimeout(() => router.push('/login'), 1200);
  } catch {
    // 错误提示由 request 拦截器处理
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.register-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.register-box {
  width: 440px;
  padding: 36px 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
  &__header {
    text-align: center;
    margin-bottom: 20px;
    h1 {
      margin: 0;
      font-size: 22px;
      color: #303133;
    }
    p {
      margin: 6px 0 0;
      color: #909399;
      font-size: 13px;
    }
  }
  &__alert {
    margin-bottom: 20px;
  }
  &__footer {
    text-align: center;
    margin-top: 4px;
    color: #909399;
    font-size: 13px;
    p {
      margin: 0;
    }
  }
  &__link {
    color: #409eff;
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
