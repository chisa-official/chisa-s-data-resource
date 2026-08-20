<template>
  <div class="tags-view">
    <el-scrollbar>
      <div class="tags-view__list">
        <div
          v-for="tag in tagsViewStore.visitedViews"
          :key="tag.path"
          class="tags-view__item"
          :class="{ 'is-active': tag.path === route.path }"
          @click="router.push(tag.path)"
          @contextmenu.prevent="openMenu(tag, $event)"
        >
          {{ tag.title }}
          <el-icon v-if="!tag.affix" class="tags-view__close" @click.stop="closeTag(tag.path)">
            <Close />
          </el-icon>
        </div>
      </div>
    </el-scrollbar>

    <ul v-show="ctxMenu.visible" class="ctx-menu" :style="{ top: ctxMenu.top + 'px', left: ctxMenu.left + 'px' }">
      <li @click="refreshCurrent">刷新</li>
      <li v-if="!currentTag?.affix" @click="closeCurrent">关闭</li>
      <li @click="closeOthers">关闭其他</li>
      <li @click="closeAll">关闭全部</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Close } from '@element-plus/icons-vue';
import { useTagsViewStore } from '@/stores/tagsView';

interface TagView {
  name: string;
  path: string;
  title: string;
  affix?: boolean;
}

const route = useRoute();
const router = useRouter();
const tagsViewStore = useTagsViewStore();

const ctxMenu = reactive({
  visible: false,
  top: 0,
  left: 0,
});
const currentTag = ref<TagView | null>(null);

function addCurrent(): void {
  if (route.name) tagsViewStore.addView(route);
}

function closeTag(path: string): void {
  const removed = tagsViewStore.removeView(path);
  if (removed && path === route.path) {
    const last = tagsViewStore.visitedViews[tagsViewStore.visitedViews.length - 1];
    router.push(last ? last.path : '/');
  }
}

function openMenu(tag: TagView, e: MouseEvent): void {
  currentTag.value = tag;
  ctxMenu.visible = true;
  ctxMenu.top = e.clientY;
  ctxMenu.left = e.clientX;
}

function closeCtxMenu(): void {
  ctxMenu.visible = false;
}

function refreshCurrent(): void {
  closeCtxMenu();
  router.replace({ path: '/redirect' + route.fullPath });
}

function closeCurrent(): void {
  closeCtxMenu();
  if (currentTag.value) closeTag(currentTag.value.path);
}

function closeOthers(): void {
  closeCtxMenu();
  if (currentTag.value) tagsViewStore.removeOthers(currentTag.value.path);
}

function closeAll(): void {
  closeCtxMenu();
  tagsViewStore.removeAll();
  const first = tagsViewStore.visitedViews[0];
  router.push(first ? first.path : '/');
}

watch(() => route.path, () => addCurrent(), { immediate: true });

onMounted(() => {
  document.addEventListener('click', closeCtxMenu);
});
onUnmounted(() => {
  document.removeEventListener('click', closeCtxMenu);
});
</script>

<style scoped lang="scss">
.tags-view {
  height: $layout-tagsview-height;
  background: $bg-surface;
  border-bottom: 1px solid $border-light;
  display: flex;
  align-items: center;
  padding: 0 $space-3;
  position: relative;

  &__list {
    display: flex;
    align-items: center;
    gap: $space-1;
    white-space: nowrap;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 $space-3;
    border: 1px solid $border-default;
    border-radius: $radius-md;
    cursor: pointer;
    font-size: $font-size-xs;
    color: $text-secondary;
    background: $bg-surface;
    transition: all 0.2s;

    &:hover {
      color: $brand-primary;
      border-color: $brand-primary-lighter;
      background: $bg-hover;
    }

    &.is-active {
      color: $text-inverse;
      background: $brand-primary;
      border-color: $brand-primary;

      .tags-view__close:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    }
  }

  &__close {
    margin-left: $space-1;
    border-radius: 50%;
    padding: 2px;
    transition: all 0.2s;

    &:hover {
      background: rgba(0, 0, 0, 0.08);
    }
  }
}

.ctx-menu {
  position: fixed;
  z-index: 3000;
  background: $bg-surface;
  border: 1px solid $border-light;
  border-radius: $radius-lg;
  box-shadow: $shadow-medium;
  padding: $space-1 0;
  margin: 0;
  list-style: none;

  li {
    padding: $space-2 $space-5;
    cursor: pointer;
    font-size: $font-size-sm;
    color: $text-secondary;
    transition: all 0.15s;

    &:hover {
      background: $bg-hover;
      color: $brand-primary;
    }
  }
}
</style>
