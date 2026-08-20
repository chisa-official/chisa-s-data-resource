<template>
  <div class="profile-page" v-loading="loading" element-loading-text="正在加载个人档案...">
    <PageHeader title="个人信息中心" subtitle="查看个人档案，敏感信息变更需提交申请" />
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="profile-card">
          <div class="profile-card__avatar">
            <el-avatar :size="100" :src="userStore.studentInfo?.photoUrl">
              {{ userStore.studentInfo?.name?.[0] || '生' }}
            </el-avatar>
            <h3>{{ userStore.studentInfo?.name }}</h3>
            <p>{{ userStore.studentInfo?.studentNo }}</p>
            <StatusTag :status="userStore.studentInfo?.status" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="16">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>基本档案</span>
              <el-button type="primary" size="small" @click="router.push('/profile/edit')">申请修改</el-button>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="姓名">{{ userStore.studentInfo?.name }}</el-descriptions-item>
            <el-descriptions-item label="性别">{{ userStore.studentInfo?.gender === 'MALE' ? '男' : '女' }}</el-descriptions-item>
            <el-descriptions-item label="学号">{{ userStore.studentInfo?.studentNo }}</el-descriptions-item>
            <el-descriptions-item label="院系">{{ userStore.studentInfo?.department?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="班级">{{ userStore.studentInfo?.class?.name || '-' }}</el-descriptions-item>
            <el-descriptions-item label="入学日期">{{ userStore.studentInfo?.enrollDate?.slice(0, 10) || '-' }}</el-descriptions-item>
            <el-descriptions-item label="手机">
              {{ maskPhone(userStore.studentInfo?.phone) }}
              <el-button type="primary" link size="small" @click="router.push('/profile/edit')">修改</el-button>
            </el-descriptions-item>
            <el-descriptions-item label="邮箱">
              {{ maskEmail(userStore.studentInfo?.email) }}
              <el-button type="primary" link size="small" @click="router.push('/profile/edit')">修改</el-button>
            </el-descriptions-item>
            <el-descriptions-item label="籍贯">{{ userStore.studentInfo?.hometown || '-' }}</el-descriptions-item>
            <el-descriptions-item label="家庭住址">{{ userStore.studentInfo?.address || '-' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@shared-web/components/PageHeader.vue';
import StatusTag from '@shared-web/components/StatusTag.vue';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);

/**
 * 进入个人档案页时强制刷新一次最新档案
 * 原因：store 的 studentInfo 被 persist 持久化到 localStorage，
 * StudentLayout 仅在 studentInfo 为 null 时才拉取，导致管理员后台修改后
 * 学生端首页看到的仍是登录时的旧数据。
 */
async function refreshProfile(): Promise<void> {
  loading.value = true;
  try {
    await userStore.fetchStudentInfo();
  } catch {
    // 接口失败时保留旧数据继续展示，错误提示由拦截器统一处理
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  refreshProfile();
});

function maskPhone(phone?: string): string {
  if (!phone) return '-';
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
function maskEmail(email?: string): string {
  if (!email) return '-';
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
}
</script>

<style scoped lang="scss">
.profile-card {
  text-align: center;
  &__avatar {
    padding: 20px 0;
    h3 {
      margin: 12px 0 4px;
    }
    p {
      margin: 0 0 12px;
      color: #909399;
    }
  }
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
