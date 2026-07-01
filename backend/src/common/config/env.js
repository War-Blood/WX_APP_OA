'use strict';

const path = require('path');
const dotenv = require('dotenv');

// 加载 .env 文件
dotenv.config();

/**
 * 必需环境变量列表
 * 启动时验证这些变量必须存在且有值
 */
const REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'OA_DB_HOST',
  'OA_DB_USER',
  'OA_DB_PASSWORD',
  'OA_DB_NAME',
  'OLD_DB_HOST',
  'OLD_DB_USER',
  'OLD_DB_PASSWORD',
  'OLD_DB_NAME',
  'REDIS_HOST',
  'REDIS_PORT',
  'JWT_SECRET',
  'WX_APPID',
];

/**
 * 验证必需环境变量
 * @throws {Error} 当必需变量缺失时抛出
 */
function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key] || !process.env[key].trim());

  if (missing.length > 0) {
    const errorMsg = `缺少必需的环境变量: ${missing.join(', ')}`;
    throw new Error(errorMsg);
  }
}

// 启动时验证
validateEnv();

/**
 * 统一配置对象
 * 所有环境变量的访问入口，含默认值兜底
 */
const config = {
  // 服务配置
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // OA 数据库（wx_app_oa）
  oaDb: {
    host: process.env.OA_DB_HOST,
    port: parseInt(process.env.OA_DB_PORT, 10) || 3306,
    user: process.env.OA_DB_USER,
    password: process.env.OA_DB_PASSWORD,
    name: process.env.OA_DB_NAME,
    poolMin: parseInt(process.env.OA_DB_POOL_MIN, 10) || 2,
    poolMax: parseInt(process.env.OA_DB_POOL_MAX, 10) || 10,
  },

  // 旧版数据库（daily_report）
  oldDb: {
    host: process.env.OLD_DB_HOST,
    port: parseInt(process.env.OLD_DB_PORT, 10) || 3306,
    user: process.env.OLD_DB_USER,
    password: process.env.OLD_DB_PASSWORD,
    name: process.env.OLD_DB_NAME,
    poolMin: parseInt(process.env.OLD_DB_POOL_MIN, 10) || 1,
    poolMax: parseInt(process.env.OLD_DB_POOL_MAX, 10) || 5,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'oa:',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '3650d'
  },

  // 微信
  wx: {
    appId: process.env.WX_APPID,
    secret: process.env.WX_SECRET || '',
  },

  // 企业微信
  qywx: {
    corpId: process.env.QYWX_CORPID || '',
    secret: process.env.QYWX_SECRET || '',
    // 管理员企微 userid 白名单（逗号分隔），白名单内用户登录即获 admin 角色
    adminUserIds: (process.env.QYWX_ADMIN_USERIDS || '').split(',').map(s => s.trim()).filter(Boolean),
  },

  // 日志
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: path.resolve(process.env.LOG_DIR || './logs'),

  // Swagger
  swaggerEnabled: process.env.SWAGGER_ENABLED === 'true',

  // 企业微信智能表格 Webhook
  wecomSmartSheet: {
    webhookKey: process.env.WECOM_SMARTSHEET_WEBHOOK_KEY || '',
  },
};

module.exports = config;
