import { defineStore } from 'pinia';
import { ref } from 'vue';
import { get } from '@shared-web/utils/request';

export const useNoticeStore = defineStore('notice', () => {
  const unreadCount = ref(0);

  async function fetchUnreadCount(): Promise<void> {
    try {
      const data = await get<{ count: number }>('/student/notice/unread-count');
      unreadCount.value = data.count;
    } catch {
      // ignore
    }
  }

  function decrement(): void {
    if (unreadCount.value > 0) unreadCount.value--;
  }

  return { unreadCount, fetchUnreadCount, decrement };
});
