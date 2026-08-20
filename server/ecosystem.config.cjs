/**
 * PM2 进程管理配置
 *
 * 说明：
 * - 后端集成 socket.io（WebSocket）与 node-cron（定时备份），必须使用 fork 模式，
 *   切勿切换为 cluster 模式，否则会出现 WebSocket 多实例冲突和定时任务重复执行。
 * - 生产环境使用编译后的 dist/server.js，启动前请先 `npm run build`。
 * - 日志按文件分离，建议配合 logrotate 或 PM2 日志模块定期清理。
 *
 * 常用命令（在 server/ 目录下执行）：
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 restart student-mgmt-server
 *   pm2 reload student-mgmt-server    # 零停机重启（fork 模式下等同于 restart）
 *   pm2 stop student-mgmt-server
 *   pm2 delete student-mgmt-server
 *   pm2 logs student-mgmt-server --lines 200
 *   pm2 monit
 *   pm2 save                          # 保存当前进程列表
 *   pm2 startup                       # 生成开机自启脚本（按提示执行返回的命令）
 */

module.exports = {
  apps: [
    {
      name: 'student-mgmt-server',
      // 生产环境运行编译产物，避免 ts-node 运行时开销
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      // 启动前预加载 tsconfig-paths 以支持路径别名
      node_args: '-r tsconfig-paths/register',
      // 启动延迟，确保 MySQL 容器就绪
      wait_ready: false,
      // 监听文件变化自动重启（生产环境关闭）
      watch: false,
      // 忽略监听的目录
      ignore_watch: ['node_modules', 'logs', 'uploads', 'backups', 'src'],
      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // .env 文件会通过 dotenv 自动加载，此处仅覆盖关键运行时变量
      },
      // 自动重启策略
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '512M',
      restart_delay: 3000,
      // 优雅关闭：发送 SIGTERM 后等待 5s 再 SIGKILL
      kill_timeout: 5000,
      // 日志配置
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      pid_file: './logs/pm2.pid',
      // 异常时不再尝试重启的退出码
      stop_exit_codes: [0],
      // 启动时间戳
      time: true,
    },
  ],
};
