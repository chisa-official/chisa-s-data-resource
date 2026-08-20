import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { get, put } from '../utils/request';
import type { Message, PageResult, UserType } from '../types';

/** WebSocket 消息监听与未读数 */
export function useMessage() {
  const unreadCount = ref(0);
  const latestMessage = ref<Message | null>(null);
  const latestMessages = ref<Message[]>([]);
  const loadingMessages = ref(false);
  let socket: Socket | null = null;

  async function connect(userId: string, userType: UserType): Promise<void> {
    if (socket) return;
    // 开发环境显式指定后端地址；生产环境留空走同源（由 Nginx 代理 /socket.io/）
    const wsBase = import.meta.env.VITE_WS_URL || '';
    socket = io(wsBase, {
      auth: { userId, userType },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });
    socket.on('connect', () => {
      console.log('[WS] 已连接');
    });
    socket.on('message', (payload: Message) => {
      latestMessage.value = payload;
      unreadCount.value++;
    });
    socket.on('disconnect', () => {
      console.log('[WS] 已断开');
    });
  }

  async function refreshUnreadCount(): Promise<void> {
    const res = await get<{ count: number }>('/shared/messages/unread-count');
    unreadCount.value = res.count;
  }

  /** 拉取最近若干条站内消息（默认未读优先，倒序） */
  async function fetchLatestMessages(pageSize = 5): Promise<void> {
    loadingMessages.value = true;
    try {
      const res = await get<PageResult<Message>>('/shared/messages', {
        page: 1,
        pageSize,
      });
      latestMessages.value = res.list || [];
    } finally {
      loadingMessages.value = false;
    }
  }

  /** 全部标记为已读，并刷新未读数与最近列表 */
  async function markAllRead(): Promise<void> {
    await put('/shared/messages/read-all');
    latestMessages.value = latestMessages.value.map((m) => ({
      ...m,
      isRead: true,
      readAt: m.readAt || new Date().toISOString(),
    }));
    unreadCount.value = 0;
  }

  function disconnect(): void {
    socket?.disconnect();
    socket = null;
  }

  return {
    unreadCount,
    latestMessage,
    latestMessages,
    loadingMessages,
    connect,
    disconnect,
    refreshUnreadCount,
    fetchLatestMessages,
    markAllRead,
  };
}

// 全局单例（同会话共享未读数）
const _instance = useMessage();
export default _instance;
