<template>
  <el-container class="admin-layout">
    <el-aside :width="collapsed ? '64px' : '220px'" class="admin-layout__aside">
      <Sidebar :collapsed="collapsed" />
    </el-aside>
    <el-container>
      <el-header class="admin-layout__header">
        <div class="admin-layout__header-left">
          <el-icon class="cursor-pointer" size="20" @click="collapsed = !collapsed">
            <Fold v-if="!collapsed" />
            <Expand v-else />
          </el-icon>
          <Breadcrumb />
        </div>
        <div class="admin-layout__header-right">
          <el-popover
            placement="bottom-end"
            :width="380"
            trigger="click"
            popper-class="msg-popover"
            @show="onPopoverShow"
          >
            <template #reference>
              <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="msg-badge">
                <el-icon size="32" class="cursor-pointer"><Bell /></el-icon>
              </el-badge>
            </template>
            <div class="msg-panel">
              <div class="msg-panel__header">
                <span class="msg-panel__title">站内消息</span>
                <el-button
                  v-if="unreadCount > 0"
                  type="primary"
                  link
                  size="small"
                  :loading="markingAll"
                  @click="onMarkAllRead"
                >全部已读</el-button>
              </div>
              <div v-loading="loadingMessages" class="msg-panel__body">
                <div v-if="!latestMessages.length && !loadingMessages" class="msg-empty">
                  暂无消息
                </div>
                <div
                  v-for="m in latestMessages"
                  :key="m.id"
                  class="msg-item"
                  :class="{ 'msg-item--unread': !m.isRead }"
                >
                  <div class="msg-item__title">
                    <span v-if="!m.isRead" class="msg-dot"></span>
                    <span>{{ m.title }}</span>
                  </div>
                  <div class="msg-item__content">{{ m.content }}</div>
                  <div class="msg-item__time">{{ formatTime(m.createdAt) }}</div>
                </div>
              </div>
            </div>
          </el-popover>
          <el-dropdown @command="onCommand">
            <span class="admin-layout__user">
              <el-avatar :size="32">{{ userStore.adminInfo?.realName?.[0] || '管' }}</el-avatar>
              <span class="ml-8">{{ userStore.adminInfo?.realName || '管理员' }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <TagsView />
      <el-main class="admin-layout__main">
        <router-view v-slot="{ Component }">
          <keep-alive :include="tagsViewStore.cachedViews">
            <component :is="Component" />
          </keep-alive>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Fold, Expand, Bell, ArrowDown } from '@element-plus/icons-vue';
import Sidebar from './components/Sidebar.vue';
import Breadcrumb from './components/Breadcrumb.vue';
import TagsView from './components/TagsView.vue';
import { useUserStore } from '@/stores/user';
import { useTagsViewStore } from '@/stores/tagsView';
import messageStore from '@shared-web/composables/useMessage';

const router = useRouter();
const userStore = useUserStore();
const tagsViewStore = useTagsViewStore();
const collapsed = ref(false);

const unreadCount = computed(() => messageStore.unreadCount.value);
const latestMessages = computed(() => messageStore.latestMessages.value);
const loadingMessages = computed(() => messageStore.loadingMessages.value);

const markingAll = ref(false);

async function onCommand(cmd: string): Promise<void> {
  if (cmd === 'password') {
    ElMessageBox.prompt('请输入新密码', '修改密码', { inputType: 'password' });
  } else if (cmd === 'logout') {
    await ElMessageBox.confirm('确认退出登录？', '提示', { type: 'warning' });
    await userStore.logout();
    tagsViewStore.removeAll();
    router.push('/login');
  }
}

/** 弹出面板展示时拉取最近消息 */
async function onPopoverShow(): Promise<void> {
  try {
    await messageStore.fetchLatestMessages(5);
  } catch {
    // ignore
  }
}

/** 全部标记已读 */
async function onMarkAllRead(): Promise<void> {
  markingAll.value = true;
  try {
    await messageStore.markAllRead();
    ElMessage.success('已全部标记为已读');
  } catch {
    // 错误提示由拦截器统一处理
  } finally {
    markingAll.value = false;
  }
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(async () => {
  // 拉取未读消息数
  try {
    await messageStore.refreshUnreadCount();
  } catch {
    // ignore
  }
});
</script>

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
  background: $bg-body;

  &__aside {
    background: #001529;
    transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
    box-shadow: 2px 0 8px rgba(0, 21, 41, 0.12);
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
      display: flex;
      align-items: center;
      gap: $space-4;

      .cursor-pointer {
        padding: $space-2;
        border-radius: $radius-lg;
        color: $text-secondary;
        transition: all 0.2s;

        &:hover {
          background: $bg-hover;
          color: $text-primary;
        }
      }
    }

    &-right {
      display: flex;
      align-items: center;
      gap: $space-5;
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

.cursor-pointer {
  cursor: pointer;
}

.ml-8 {
  margin-left: $space-2;
}

.msg-badge {
  margin-right: $space-2;
  cursor: pointer;

  .el-icon {
    padding: 2px;
    border-radius: $radius-lg;
    color: $text-secondary;
    transition: all 0.2s;

    &:hover {
      background: $bg-hover;
      color: $text-primary;
    }
  }
}
</style>

<style lang="scss">
// 消息面板（el-popover 内容 teleport 到 body，需用非 scoped 样式）
.msg-popover {
  padding: $space-4 !important;

  .msg-panel {
    &__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: $space-3;
      border-bottom: 1px solid $border-light;
    }

    &__title {
      font-size: $font-size-base;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }

    &__body {
      max-height: 360px;
      overflow-y: auto;
      margin-top: $space-2;
      @include scrollbar;
    }
  }

  .msg-empty {
    padding: $space-7 0;
    text-align: center;
    color: $text-tertiary;
    font-size: $font-size-sm;
  }

  .msg-item {
    padding: $space-3 $space-2;
    border-bottom: 1px solid $border-light;
    border-radius: $radius-lg;
    transition: background 0.2s;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: $bg-hover;
    }

    &--unread .msg-item__title span:last-child {
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }

    &__title {
      display: flex;
      align-items: center;
      gap: $space-2;
      font-size: $font-size-sm;
      color: $text-secondary;
      margin-bottom: $space-1;
    }

    &__content {
      font-size: $font-size-xs;
      color: $text-tertiary;
      line-height: $line-height-normal;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    &__time {
      font-size: $font-size-xs;
      color: $text-tertiary;
      margin-top: $space-1;
    }
  }

  .msg-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: $semantic-danger;
    flex-shrink: 0;
  }
}
</style>
