import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { errorHandler, notFoundHandler } from './shared/error/handler';
import { requestLogger } from './shared/logger/logger';
import { logger } from './shared/logger/logger';
import { initConfigs } from './shared/config/config.cache';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/shared/auth.routes';
import fileRoutes from './routes/shared/file.routes';
import messageRoutes from './routes/shared/message.routes';
import configRoutes from './routes/shared/config.routes';
import backupRoutes from './routes/shared/backup.routes';

// 学生端业务路由（任务书01 模块1-3）
import studentAuthRoutes from './routes/student/auth.routes';
import studentProfileRoutes from './routes/student/profile.routes';
import studentStatusRoutes from './routes/student/status.routes';
import studentCourseRoutes from './routes/student/course.routes';
// 学生端业务路由（任务书01 模块4：奖惩资助 + 考勤请假）
import studentAwardRoutes from './routes/student/award.routes';
import studentDisciplineRoutes from './routes/student/discipline.routes';
import studentLeaveRoutes from './routes/student/leave.routes';
import studentAttendanceRoutes from './routes/student/attendance.routes';
// 学生端业务路由（任务书01 模块6-8：宿舍 + 通知公告 + 反馈报修）
import studentDormRoutes from './routes/student/dorm.routes';
import studentNoticeRoutes from './routes/student/notice.routes';
import studentFeedbackRoutes from './routes/student/feedback.routes';

// 后台管理端业务路由（任务书02 模块1-2：RBAC + 基础数据）
import adminAuthRoutes from './routes/admin/auth.routes';
import adminUserRoutes from './routes/admin/user.routes';
import adminRoleRoutes from './routes/admin/role.routes';
import adminMenuRoutes from './routes/admin/menu.routes';
import adminLogRoutes from './routes/admin/log.routes';
import adminBaseRoutes from './routes/admin/base.routes';
// 后台管理端业务路由（任务书02 模块3-4：学籍管理 + 教务模块）
import adminStudentRoutes from './routes/admin/student.routes';
import adminStatusRoutes from './routes/admin/status.routes';
import adminScheduleRoutes from './routes/admin/schedule.routes';
import adminScoreRoutes from './routes/admin/score.routes';
import adminSelectionRoutes from './routes/admin/selection.routes';
import adminRetakeRoutes from './routes/admin/retake.routes';
// 后台管理端业务路由（任务书02 模块5+7：学工管理 + 考勤管理）
import adminAffairsRoutes from './routes/admin/affairs.routes';
import adminAttendanceRoutes from './routes/admin/attendance.routes';
// 后台管理端业务路由（任务书02 模块6+8+反馈：宿舍 + 通知 + 反馈报修）
import adminDormRoutes from './routes/admin/dorm.routes';
import adminNoticeRoutes from './routes/admin/notice.routes';
import adminFeedbackRoutes from './routes/admin/feedback.routes';
// 后台管理端业务路由（任务书02 模块9：报表统计 + 工作台概览）
import adminReportRoutes from './routes/admin/report.routes';
import adminDashboardRoutes from './routes/admin/dashboard.routes';

export async function createApp(): Promise<express.Application> {
  const app = express();

  // 确保必要目录存在
  const uploadDir = path.resolve(process.env.UPLOAD_DIR || 'uploads');
  const backupDir = path.resolve(process.env.BACKUP_DIR || 'backups');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  // 全局中间件
  app.use(helmet({ crossOriginResourcePolicy: false })); // 允许跨域加载本地文件
  // ===== CORS：支持通配符、多域名逗号分隔 =====
  const corsOriginsRaw = (process.env.CORS_ORIGIN || '').trim();
  if (corsOriginsRaw) {
    const allowedPatterns = corsOriginsRaw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    // 将通配符（*.netlify.app）转换为正则
    const allowedRegexes = allowedPatterns
      .filter((p) => p.includes('*'))
      .map((p) => new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$'));
    const allowedExact = allowedPatterns.filter((p) => !p.includes('*'));
    app.use(
      cors({
        origin: (origin, callback) => {
          // 非浏览器请求（如 curl / Postman / 健康检查）origin 为空，放行
          if (!origin) return callback(null, true);
          // 精确匹配
          if (allowedExact.includes(origin)) return callback(null, true);
          // 通配符正则匹配
          if (allowedRegexes.some((r) => r.test(origin))) return callback(null, true);
          return callback(new Error(`CORS 不允许的来源: ${origin}`));
        },
        credentials: true,
      }),
    );
  } else {
    // 开发环境默认放行 Vite 默认端口；Render 免费环境如果没配 CORS 则放行全部方便调试
    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin) return callback(null, true);
          // 本地开发常用端口
          if (
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:') ||
            origin.endsWith('.netlify.app')
          ) {
            return callback(null, true);
          }
          // 开发环境宽松放行
          if (process.env.NODE_ENV !== 'production') return callback(null, true);
          return callback(new Error(`CORS 不允许的来源: ${origin}，请在环境变量 CORS_ORIGIN 中配置`));
        },
        credentials: true,
      }),
    );
  }
  app.use(compression());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('tiny'));
  } else {
    app.use(morgan('combined'));
  }
  app.use(requestLogger);

  // Swagger 文档（生产环境可通过 ENABLE_SWAGGER=false 关闭）
  const enableSwagger = process.env.ENABLE_SWAGGER !== 'false';
  if (enableSwagger) {
    const publicBase = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const swaggerSpec = swaggerJsdoc({
      definition: {
        openapi: '3.0.0',
        info: {
          title: '高校学生管理系统 API',
          version: '0.1.0',
          description: '包含学生端、后台管理端、公共支撑模块全部接口',
        },
        servers: [
          { url: `${publicBase}/api`, description: process.env.NODE_ENV === 'production' ? '生产环境' : '本地开发' },
        ],
      },
      apis: ['./src/routes/**/*.ts'],
    });
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  }

  // 路由挂载
  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/shared/files', fileRoutes);
  app.use('/api/shared/messages', messageRoutes);
  app.use('/api/shared/config', configRoutes);
  app.use('/api/admin/backup', backupRoutes);

  // 学生端业务路由前缀 /api/student/*
  app.use('/api/student/auth', studentAuthRoutes);
  app.use('/api/student/profile', studentProfileRoutes);
  app.use('/api/student/status', studentStatusRoutes);
  app.use('/api/student/course', studentCourseRoutes);
  app.use('/api/student/award', studentAwardRoutes);
  app.use('/api/student/discipline', studentDisciplineRoutes);
  app.use('/api/student/leave', studentLeaveRoutes);
  app.use('/api/student/attendance', studentAttendanceRoutes);
  app.use('/api/student/dorm', studentDormRoutes);
  app.use('/api/student/notice', studentNoticeRoutes);
  app.use('/api/student/feedback', studentFeedbackRoutes);
  // 后台管理端业务路由前缀 /api/admin/*
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/admin/system/users', adminUserRoutes);
  app.use('/api/admin/system/roles', adminRoleRoutes);
  app.use('/api/admin/system/menus', adminMenuRoutes);
  app.use('/api/admin/system/logs', adminLogRoutes);
  app.use('/api/admin/base', adminBaseRoutes);
  // 模块3-4：学籍管理 + 教务模块
  app.use('/api/admin/students', adminStudentRoutes);
  app.use('/api/admin/status', adminStatusRoutes);
  app.use('/api/admin/schedules', adminScheduleRoutes);
  app.use('/api/admin/scores', adminScoreRoutes);
  app.use('/api/admin/selection', adminSelectionRoutes);
  app.use('/api/admin/retake', adminRetakeRoutes);
  // 模块5+7：学工管理 + 考勤管理
  app.use('/api/admin/affairs', adminAffairsRoutes);
  app.use('/api/admin/attendance', adminAttendanceRoutes);
  // 模块6+8+反馈：宿舍管理 + 通知公告 + 反馈报修
  app.use('/api/admin/dorms', adminDormRoutes);
  app.use('/api/admin/notices', adminNoticeRoutes);
  app.use('/api/admin/feedbacks', adminFeedbackRoutes);
  // 模块9：报表统计 + 工作台概览
  app.use('/api/admin/report', adminReportRoutes);
  app.use('/api/admin/dashboard', adminDashboardRoutes);

  // 404 与错误处理
  app.use(notFoundHandler);
  app.use(errorHandler);

  // 预热配置缓存
  try {
    await initConfigs();
  } catch (e) {
    logger.warn('配置缓存预热失败（数据库可能未就绪）', { error: e instanceof Error ? e.message : e });
  }

  return app;
}
