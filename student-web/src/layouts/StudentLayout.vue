<template>
  <el-container class="student-layout">
    <el-aside width="220px" class="student-layout__aside">
      <div class="student-layout__logo">
        <el-icon size="24" color="#fff"><School /></el-icon>
        <span>学生管理系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :router="true"
        background-color="#001529"
        text-color="rgba(255, 255, 255, 0.82)"
        active-text-color="#60a5fa"
      >
        <el-sub-menu index="profile">
          <template #title>
            <el-icon><User /></el-icon>
            <span>个人信息中心</span>
          </template>
          <el-menu-item index="/profile">个人档案</el-menu-item>
          <el-menu-item index="/profile/edit">信息修改申请</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="status">
          <template #title>
            <el-icon><Document /></el-icon>
            <span>学籍管理</span>
          </template>
          <el-menu-item index="/status">学籍状态</el-menu-item>
          <el-menu-item index="/status/certificate">证明申请</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="course">
          <template #title>
            <el-icon><Reading /></el-icon>
            <span>课程与成绩</span>
          </template>
          <el-menu-item index="/course/timetable">我的课表</el-menu-item>
          <el-menu-item index="/course/score">我的成绩</el-menu-item>
          <el-menu-item index="/course/select">选课</el-menu-item>
          <el-menu-item index="/course/retake">重修报名</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="award">
          <template #title>
            <el-icon><Trophy /></el-icon>
            <span>奖惩资助</span>
          </template>
          <el-menu-item index="/award/scholarship">奖学金</el-menu-item>
          <el-menu-item index="/award/aid">助学金</el-menu-item>
          <el-menu-item index="/award/honor">评优</el-menu-item>
          <el-menu-item index="/award/discipline">违纪记录</el-menu-item>
        </el-sub-menu>
        <el-sub-menu index="attendance">
          <template #title>
            <el-icon><Calendar /></el-icon>
            <span>考勤请假</span>
          </template>
          <el-menu-item index="/attendance/leave">请假申请</el-menu-item>
          <el-menu-item index="/attendance/record">考勤记录</el-menu-item>
        </el-sub-menu>
        <el-menu-item index="/dorm">
          <el-icon><House /></el-icon>
          <span>宿舍管理</span>
        </el-menu-item>
        <el-menu-item index="/notice">
          <el-icon><Bell /></el-icon>
          <span>通知公告</span>
          <el-badge v-if="noticeStore.unreadCount > 0" :value="noticeStore.unreadCount" class="aside-badge" />
        </el-menu-item>
        <el-sub-menu index="feedback">
          <template #title>
            <el-icon><ChatLineRound /></el-icon>
            <span>反馈报修</span>
          </template>
          <el-menu-item index="/feedback/repair">报修</el-menu-item>
          <el-menu-item index="/feedback/complaint">意见反馈</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header v-if="userStore.pendingAssign" class="student-layout__pending">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          style="width: 100%"
          title="账号待审核"
          description="您的账号尚未分配院系/班级，部分功能可能受限。请耐心等待管理员审核，或联系教务人员办理。"
        />
      </el-header>
      <el-header class="student-layout__header">
        <div class="student-layout__header-left">
          <span>{{ pageTitle }}</span>
        </div>
        <div class="student-layout__header-right">
          <el-badge :value="noticeStore.unreadCount" :hidden="noticeStore.unreadCount === 0" :max="99">
            <el-icon size="20" class="cursor-pointer" @click="router.push('/notice')"><Bell /></el-icon>
          </el-badge>
          <el-dropdown @command="onCommand">
            <span class="student-layout__user">
              <el-avatar :size="32" :src="userStore.studentInfo?.photoUrl">{{ userStore.studentInfo?.name?.[0] || '生' }}</el-avatar>
              <span class="ml-8">{{ userStore.studentInfo?.name || '学生' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人档案</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="student-layout__main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import {
  School,
  User,
  Document,
  Reading,
  Trophy,
  Calendar,
  House,
  Bell,
  ChatLineRound,
  ArrowDown,
} from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { useNoticeStore } from '@/stores/notice';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const noticeStore = useNoticeStore();

const activeMenu = computed(() => route.path);
const pageTitle = computed(() => (route.meta.title as string) || '');

async function onCommand(cmd: string): Promise<void> {
  if (cmd === 'profile') {
    router.push('/profile');
  } else if (cmd === 'password') {
    router.push('/profile/edit');
  } else if (cmd === 'logout') {
    await ElMessageBox.confirm('确认退出登录？', '提示', { type: 'warning' });
    await userStore.logout();
    router.push('/login');
  }
}

onMounted(async () => {
  if (userStore.accessToken && !userStore.studentInfo) {
    try {
      await userStore.fetchStudentInfo();
    } catch {
      // ignore
    }
  }
  await noticeStore.fetchUnreadCount();
});
</script>

<style scoped lang="scss">
.student-layout {
  height: 100vh;
  background: $bg-body;

  &__aside {
    background: #001529;
    overflow-y: auto;
    box-shadow: 2px 0 8px rgba(0, 21, 41, 0.12);

    .el-menu {
      border-right: none;
      background: transparent;

      .el-menu-item,
      .el-sub-menu__title {
        color: rgba(255, 255, 255, 0.82);
        border-radius: 0 $radius-xl $radius-xl 0;
        margin: 0 $space-2 0 0;

        &:hover {
          background: rgba(255, 255, 255, 0.06);
          color: $text-inverse;
        }

        &.is-active {
          background: rgba(37, 99, 235, 0.18);
          color: $brand-primary-lighter;
        }
      }

      .el-sub-menu.is-active .el-sub-menu__title {
        color: $brand-primary-lighter;
      }
    }
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: $space-2;
    height: $layout-header-height;
    padding: 0 $space-5;
    color: $text-inverse;
    font-size: $font-size-md;
    font-weight: $font-weight-semibold;
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    .el-icon {
      color: $brand-primary-light;
      flex-shrink: 0;
    }
  }

  &__pending {
    height: auto;
    padding: $space-3 $space-5;
    background: $semantic-warning-light;
    border-bottom: 1px solid #fde68a;
    box-shadow: none;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: $layout-header-height;
    padding: 0 $space-5;
    background: $bg-surface;
    border-bottom: 1px solid $border-light;
    box-shadow: $shadow-subtle;

    &-left {
      font-size: $font-size-md;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }

    &-right {
      display: flex;
      align-items: center;
      gap: $space-5;

      .el-badge .el-icon {
        padding: $space-2;
        border-radius: $radius-lg;
        color: $text-secondary;
        transition: all 0.2s;
        cursor: pointer;

        &:hover {
          background: $bg-hover;
          color: $text-primary;
        }
      }
    }
  }

  &__user {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-1 $space-2 $space-1 $space-1;
    border-radius: $radius-xl;
    cursor: pointer;
    color: $text-secondary;
    transition: all 0.2s;

    &:hover {
      background: $bg-hover;
      color: $text-primary;
    }

    .el-avatar {
      border: 2px solid $border-light;
    }

    span {
      font-size: $font-size-sm;
      font-weight: $font-weight-medium;
      max-width: 100px;
      @include text-ellipsis;
    }
  }

  &__main {
    background: $bg-body;
    padding: $space-5;
    overflow-y: auto;
  }
}

.aside-badge {
  margin-left: $space-2;
}

.cursor-pointer {
  cursor: pointer;
}

.ml-8 {
  margin-left: $space-2;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
