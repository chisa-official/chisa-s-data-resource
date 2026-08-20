import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { initWebSocket } from './shared/message/websocket';
import { scheduleBackup } from './shared/backup/schedule';
import { logger } from './shared/logger/logger';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  const port = Number(process.env.PORT) || 3000;

  const server = http.createServer(app);

  // 初始化 WebSocket
  initWebSocket(server);

  // 注册定时备份
  try {
    await scheduleBackup();
  } catch (e) {
    logger.warn('定时备份注册失败', { error: e instanceof Error ? e.message : e });
  }

  server.listen(port, () => {
    logger.info(`服务已启动: http://localhost:${port}`);
    logger.info(`Swagger 文档: http://localhost:${port}/api-docs`);
  });

  // 优雅关闭
  const shutdown = (signal: string) => {
    logger.info(`收到 ${signal}，开始优雅关闭...`);
    server.close(() => {
      logger.info('服务已停止');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('强制关闭');
      process.exit(1);
    }, 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 未捕获异常兜底
  process.on('uncaughtException', (err) => {
    logger.error('uncaughtException', { error: err.message, stack: err.stack });
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('unhandledRejection', { reason });
  });
}

bootstrap().catch((e) => {
  logger.error('启动失败', { error: e });
  process.exit(1);
});
