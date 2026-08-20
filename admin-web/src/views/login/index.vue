<template>
  <div class="login-page">
    <div class="login-page__brand">
      <div class="login-brand">
        <div class="login-brand__icon">
          <el-icon :size="64"><School /></el-icon>
        </div>
        <h1 class="login-brand__title">高校学生管理系统</h1>
        <p class="login-brand__subtitle">后台管理端</p>
        <p class="login-brand__desc">一体化教务管理，助力智慧校园建设</p>
      </div>
    </div>

    <div class="login-page__form">
      <div class="login-box">
        <div class="login-box__header">
          <h2>欢迎登录</h2>
          <p>请输入管理员账号和密码</p>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @submit.prevent="onSubmit">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" :prefix-icon="User" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" :prefix-icon="Lock" @keyup.enter="onSubmit" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="loading" class="login-box__submit" @click="onSubmit">登 录</el-button>
          </el-form-item>
        </el-form>
        <div class="login-box__tip">
          <p>超级管理员：admin / admin123</p>
        </div>
        <div class="login-box__footer">
          <p>
            还没有账号？
            <router-link to="/register" class="login-box__link">立即注册</router-link>
            <span class="login-box__divider">|</span>
            <span class="login-box__tip-text">注册后需管理员审核激活</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { User, Lock, School } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { usePermissionStore } from '@/stores/permission';
import { passwordRule } from '@shared-web/utils/validate';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const permissionStore = usePermissionStore();
const formRef = ref<FormInstance>();
const loading = ref(false);

const form = reactive({
  username: '',
  password: '',
});

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: passwordRule,
};

async function onSubmit(): Promise<void> {
  if (!formRef.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  loading.value = true;
  try {
    permissionStore.reset();
    await userStore.login(form);
    ElMessage.success('登录成功');
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch {
    // 错误提示由 request 拦截器处理
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.login-page {
  display: flex;
  min-height: 100vh;
  background: $bg-body;

  &__brand {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: $space-7;
    background: linear-gradient(135deg, $brand-primary 0%, $brand-primary-darker 100%);
    color: $text-inverse;
    overflow: hidden;

    &::before,
    &::after {
      content: '';
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
    }

    &::before {
      width: 400px;
      height: 400px;
      top: -100px;
      right: -100px;
    }

    &::after {
      width: 260px;
      height: 260px;
      bottom: 60px;
      left: -60px;
    }
  }

  &__form {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 520px;
    padding: $space-7;
    background: $bg-surface;
  }
}

.login-brand {
  position: relative;
  z-index: 1;
  text-align: center;
  max-width: 420px;

  &__icon {
    @include flex-center;
    width: 110px;
    height: 110px;
    margin: 0 auto $space-6;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(4px);
  }

  &__title {
    margin: 0;
    font-size: $font-size-3xl;
    font-weight: $font-weight-bold;
    letter-spacing: 1px;
  }

  &__subtitle {
    margin: $space-3 0 0;
    font-size: $font-size-xl;
    font-weight: $font-weight-medium;
    color: rgba(255, 255, 255, 0.85);
  }

  &__desc {
    margin: $space-5 0 0;
    font-size: $font-size-base;
    color: rgba(255, 255, 255, 0.65);
    line-height: $line-height-relaxed;
  }
}

.login-box {
  width: 100%;
  max-width: 400px;

  &__header {
    text-align: center;
    margin-bottom: $space-7;

    h2 {
      margin: 0;
      font-size: $font-size-2xl;
      color: $text-primary;
    }

    p {
      margin: $space-2 0 0;
      color: $text-secondary;
      font-size: $font-size-sm;
    }
  }

  &__submit {
    width: 100%;
    height: 44px;
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    border-radius: $radius-lg;
  }

  &__tip {
    text-align: center;
    color: $text-tertiary;
    font-size: $font-size-xs;
    margin-top: $space-4;
  }

  &__footer {
    text-align: center;
    color: $text-secondary;
    font-size: $font-size-sm;
    margin-top: $space-4;

    p {
      margin: 0;
    }
  }

  &__link {
    color: $brand-primary;
    text-decoration: none;
    font-weight: $font-weight-medium;

    &:hover {
      color: $brand-primary-dark;
      text-decoration: underline;
    }
  }

  &__divider {
    margin: 0 $space-2;
    color: $border-dark;
  }

  &__tip-text {
    color: $semantic-warning;
    font-size: $font-size-xs;
  }
}

@media (max-width: 1024px) {
  .login-page {
    flex-direction: column;

    &__brand {
      min-height: 260px;
      padding: $space-7 $space-5;
    }

    &__form {
      width: 100%;
      padding: $space-7 $space-5;
      flex: 1;
    }
  }

  .login-brand {
    &__icon {
      width: 80px;
      height: 80px;
      margin-bottom: $space-4;
    }

    &__title {
      font-size: $font-size-2xl;
    }

    &__subtitle,
    &__desc {
      display: none;
    }
  }
}
</style>
