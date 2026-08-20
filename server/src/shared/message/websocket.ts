import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { UserType } from '@prisma/client';
import { logger } from '../logger/logger';

let io: SocketIOServer | null = null;

/** room 命名规则：{userType}:{userId}，避免学生与管理员 ID 冲突 */
function roomName(userId: string, userType: UserType): string {
  return `${userType}:${userId}`;
}

/** 初始化 WebSocket 服务，需在 HTTP server 启动后调用 */
export function initWebSocket(httpServer: HttpServer): SocketIOServer {
  // ===== CORS：与 app.ts 中 HTTP CORS 保持一致，支持通配符、多域名、函数回调 =====
  const corsOriginsRaw = (process.env.CORS_ORIGIN || '').trim();
  let corsOriginConfig: any;

  if (corsOriginsRaw) {
    const allowedPatterns = corsOriginsRaw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const allowedRegexes = allowedPatterns
      .filter((p) => p.includes('*'))
      .map((p) => new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'));
    const allowedExact = allowedPatterns.filter((p) => !p.includes('*'));

    corsOriginConfig = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (allowedExact.includes(origin)) return callback(null, true);
      if (allowedRegexes.some((r) => r.test(origin))) return callback(null, true);
      callback(new Error(`WebSocket CORS 不允许的来源: ${origin}`));
    };
  } else {
    corsOriginConfig = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.endsWith('.netlify.app')
      ) {
        return callback(null, true);
      }
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      callback(new Error(`WebSocket CORS 不允许的来源: ${origin}，请在环境变量 CORS_ORIGIN 中配置`));
    };
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOriginConfig,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    const { userId, userType } = socket.handshake.auth as { userId?: string; userType?: UserType };
    if (!userId || !userType) {
      socket.disconnect();
      return;
    }

    const room = roomName(userId, userType);
    socket.join(room);
    logger.info(`WebSocket 已连接: ${room} (socket ${socket.id})`);

    socket.on('disconnect', () => {
      logger.info(`WebSocket 断开: ${room} (socket ${socket.id})`);
    });

    socket.on('ping', (cb: () => void) => cb && cb());
  });

  return io;
}

/** 向指定用户推送消息 */
export function emitMessage(
  userId: string,
  userType: UserType,
  payload: any,
): void {
  if (!io) {
    logger.warn('WebSocket 未初始化，跳过推送');
    return;
  }
  io.to(roomName(userId, userType)).emit('message', payload);
}

/** 获取 io 实例（供业务模块使用） */
export function getIO(): SocketIOServer | null {
  return io;
}
