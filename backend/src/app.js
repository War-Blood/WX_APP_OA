'use strict';

// ============================================
// 智慧办公助手 OA 后端 API 服务 — 应用入口
// ============================================

// 1. 环境变量加载（最先执行）
require('dotenv').config();
const config = require('./common/config/env');

// 2. 初始化日志
const logger = require('./common/utils/logger');
logger.info('服务启动中...', { module: 'APP', env: config.nodeEnv });

// 3. 初始化数据库连接池（延迟初始化，启动时不强制连接）
const db = require('./common/config/database');
const redis = require('./common/config/redis');

// 4. 创建 Express 实例
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

// 信任 nginx 反代（解决 rate-limit X-Forwarded-For 报错）
app.set('trust proxy', 1);

// 5. 注册安全中间件
app.use(helmet({
  contentSecurityPolicy: false,   // 小程序不需要 CSP
  crossOriginEmbedderPolicy: false,
}));

// CORS — 开发阶段放开
app.use(cors({
  origin: [
    'https://warblood.online',
    'http://localhost:8080',
    'http://localhost:5173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 全局限流 — 300 次 / 15 分钟（正常用户打开仪表盘会并发 5-6 个请求，避免误触发）
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { code: 429, message: '请求过于频繁，请稍后再试', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 登录端点限流 — 仅失败请求计数，防止暴力破解
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skipSuccessfulRequests: true,
  message: { code: 429, message: '登录尝试过于频繁，请15分钟后再试', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});

// 6. 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 捕获 JSON 解析错误
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      code: 1001,
      message: '请求体 JSON 格式错误',
      data: null,
    });
  }
  next(err);
});

// 7. 请求日志中间件
const { requestLogger } = require('./common/utils/logger');
app.use(requestLogger);

// 8. Swagger 文档
if (config.swaggerEnabled) {
  try {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./common/config/swagger');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: '智慧办公助手 API 文档',
    }));
    logger.info('Swagger 文档已挂载', { module: 'APP', path: '/api-docs' });
  } catch (err) {
    logger.warn('Swagger 挂载失败', { module: 'APP', error: err.message });
  }
}

// 9. 注册路由
const coreRoutes = require('./core/routes');
app.use('/api', coreRoutes);

// Auth 路由（登录、用户资料）
// 登录端点应用严格限流
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/admin/login', authLimiter);
const authRoutes = require('./auth/routes/auth.routes');
app.use('/api', authRoutes);

// Features 路由（Stats 模块）
const statsRoutes = require('./features/routes/stats.routes');
app.use('/api', statsRoutes);

// 审核路由（管理员专属）
const reviewRoutes = require('./features/routes/review.routes');
app.use('/api', reviewRoutes);

// 消息通知路由
const messageRoutes = require('./core/routes/message.routes');
app.use('/api/message', messageRoutes);

// WPS 数据接口（API Key 鉴权）
const wpsRoutes = require('./features/routes/wps.routes');
app.use('/api', wpsRoutes);

// 合规管理路由
const complianceRoutes = require('./features/compliance/routes/compliance.routes');
app.use('/api/compliance', complianceRoutes);

// 10. 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 1002,
    message: `资源不存在: ${req.method} ${req.originalUrl}`,
    data: null,
  });
});

// 11. 全局错误处理
const errorHandler = require('./common/middleware/errorHandler');
app.use(errorHandler);

// 12. 启动服务器（测试模式下由 supertest 管理，不自动启动）
let server;

if (!config.isTest) {
  server = app.listen(config.port, '0.0.0.0', async () => {
    logger.info(`服务启动成功`, {
      module: 'APP',
      port: config.port,
      env: config.nodeEnv,
      apiBase: '/api',
      docs: config.swaggerEnabled ? `http://localhost:${config.port}/api-docs` : '未启用',
    });

    // 尝试初始化 Redis 连接
    try {
      await redis.initRedis();
      logger.info('Redis 连接就绪', { module: 'APP' });
    } catch (err) {
      logger.warn('Redis 暂未连接，将在首次使用时建立', {
        module: 'APP',
        error: err.message,
      });
    }
  });

  // 13. 启动定时任务
  require('./common/tasks/scheduler');

  // 14. 优雅退出
  async function shutdown(signal) {
    logger.info(`收到 ${signal} 信号，开始优雅退出...`, { module: 'APP' });

    server.close(async () => {
      logger.info('HTTP 服务器已关闭', { module: 'APP' });

      // 关闭 Redis 连接
      try {
        await redis.closeRedis();
      } catch (err) {
        logger.warn('关闭 Redis 连接时出错', { module: 'APP', error: err.message });
      }

      logger.info('服务已完全关闭', { module: 'APP' });
      process.exit(0);
    });

    // 10 秒后强制退出
    setTimeout(() => {
      logger.error('优雅退出超时，强制退出', { module: 'APP' });
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // 未捕获异常处理
  process.on('uncaughtException', (err) => {
    logger.error('未捕获的异常', { module: 'APP', error: err.message, stack: err.stack });
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('未处理的 Promise 拒绝', { module: 'APP', error: reason });
  });
}

module.exports = app;
