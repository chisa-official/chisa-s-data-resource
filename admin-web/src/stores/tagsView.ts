import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { RouteLocationNormalized } from 'vue-router';

interface TagView {
  name: string;
  path: string;
  title: string;
  affix?: boolean; // 固定标签
}

/** 多标签页缓存 */
export const useTagsViewStore = defineStore('tagsView', {
  state: () => ({
    visitedViews: ref<TagView[]>([]),
    cachedViews: ref<string[]>([]),
  }),
  actions: {
    addView(route: RouteLocationNormalized): void {
      if (!route.name || route.meta?.hidden) return;
      const exists = this.visitedViews.find((v) => v.path === route.path);
      if (exists) return;
      this.visitedViews.push({
        name: route.name as string,
        path: route.path,
        title: (route.meta?.title as string) || '未命名',
        affix: route.meta?.affix as boolean | undefined,
      });
      if (route.name && !this.cachedViews.includes(route.name as string)) {
        this.cachedViews.push(route.name as string);
      }
    },
    removeView(path: string): TagView | undefined {
      const idx = this.visitedViews.findIndex((v) => v.path === path);
      if (idx >= 0) {
        const removed = this.visitedViews.splice(idx, 1)[0];
        const cIdx = this.cachedViews.indexOf(removed.name);
        if (cIdx >= 0) this.cachedViews.splice(cIdx, 1);
        return removed;
      }
      return undefined;
    },
    removeOthers(path: string): void {
      this.visitedViews = this.visitedViews.filter((v) => v.affix || v.path === path);
      this.cachedViews = this.visitedViews.map((v) => v.name);
    },
    removeAll(): void {
      this.visitedViews = this.visitedViews.filter((v) => v.affix);
      this.cachedViews = this.visitedViews.map((v) => v.name);
    },
  },
  persist: {
    paths: ['visitedViews'],
  },
});
