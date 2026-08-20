<template>
  <div class="register-page">
    <div class="register-box">
      <div class="register-box__header">
        <h1>管理员账号注册</h1>
        <p>高校学生管理系统 - 后台管理端</p>
      </div>

      <el-alert
        type="warning"
        :closable="false"
        show-icon
        class="register-box__alert"
        title="审核提醒"
        description="注册后账号默认处于未激活状态，需联系超级管理员在「系统管理 - 用户管理」中审核启用后，方可登录使用。"
      />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="default"
        @submit.prevent="onSubmit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="form.username"
            placeholder="4-20 位字母、数字或下划线"
            :prefix-icon="User"
            maxlength="20"
          />
        </el-form-item>

        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入真实姓名" :prefix-icon="UserFilled" maxlength="50" />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="选填，便于联系" :prefix-icon="Phone" maxlength="11" />
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
import { User, UserFilled, Lock, Phone } from '@element-plus/icons-vue';
import { register } from '@/api/auth';
import { usernameRule, phoneRule, strongPasswordRule, required } from '@shared-web/utils/validate';

const router = useRouter();
const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  username: '',
  realName: '',
  phone: '',
  password: '',
  confirmPassword: '',
});

const rules: FormRules = {
  username: usernameRule,
  realName: [required('请输入真实姓名')],
  phone: phoneRule,
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
      username: form.username,
      realName: form.realName,
      phone: form.phone || undefined,
      password: form.password,
      confirmPassword: form.confirmPassword,
    });
    ElMessage.success('注册成功，请等待管理员审核激活');
    setTimeout(() => router.push('/login'), 1500);
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
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
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
