'use strict';

// Mock dotenv to prevent .env file loading in tests
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

const ORIGINAL_ENV = { ...process.env };

// 所有必须的环境变量（必须与 src/config/env.js 中的 REQUIRED_VARS 一致）
const REQUIRED_ENV_VARS = {
  NODE_ENV: 'test',
  PORT: '3000',
  OA_DB_HOST: 'localhost',
  OA_DB_USER: 'test_user',
  OA_DB_PASSWORD: 'test_pass',
  OA_DB_NAME: 'test_oa',
  OLD_DB_HOST: 'localhost',
  OLD_DB_USER: 'old_user',
  OLD_DB_PASSWORD: 'old_pass',
  OLD_DB_NAME: 'old_db',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '6379',
  JWT_SECRET: 'test-jwt-secret',
  WX_APPID: 'test-appid',
};

function setRequiredEnv() {
  Object.entries(REQUIRED_ENV_VARS).forEach(([key, val]) => {
    process.env[key] = val;
  });
}

describe('环境变量配置 - env.js', () => {
  beforeEach(() => {
    jest.resetModules();
    setRequiredEnv();
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('必填变量解析', () => {
    it('应正确解析 PORT 为数字', () => {
      process.env.PORT = '5000';
      const config = require('../../../src/common/config/env');
      expect(config.port).toBe(5000);
    });

    it('PORT 为非数字时应兜底为 3000', () => {
      process.env.PORT = 'abc';
      const config = require('../../../src/common/config/env');
      expect(config.port).toBe(3000);
    });
  });

  describe('可选默认值兜底', () => {
    it('OA_DB_PORT 默认应为 3306', () => {
      delete process.env.OA_DB_PORT;
      const config = require('../../../src/common/config/env');
      expect(config.oaDb.port).toBe(3306);
    });

    it('OA_DB 连接池默认最小 2 最大 10', () => {
      delete process.env.OA_DB_POOL_MIN;
      delete process.env.OA_DB_POOL_MAX;
      const config = require('../../../src/common/config/env');
      expect(config.oaDb.poolMin).toBe(2);
      expect(config.oaDb.poolMax).toBe(10);
    });

    it('OLD_DB_PORT 默认应为 3306', () => {
      delete process.env.OLD_DB_PORT;
      const config = require('../../../src/common/config/env');
      expect(config.oldDb.port).toBe(3306);
    });

    it('OLD_DB 连接池默认最小 1 最大 5', () => {
      delete process.env.OLD_DB_POOL_MIN;
      delete process.env.OLD_DB_POOL_MAX;
      const config = require('../../../src/common/config/env');
      expect(config.oldDb.poolMin).toBe(1);
      expect(config.oldDb.poolMax).toBe(5);
    });

    // REDIS_HOST 和 REDIS_PORT 为必需变量，不测试默认值兜底

    it('REDIS_KEY_PREFIX 默认应为 oa:', () => {
      delete process.env.REDIS_KEY_PREFIX;
      const config = require('../../../src/common/config/env');
      expect(config.redis.keyPrefix).toBe('oa:');
    });

    it('JWT_EXPIRES_IN 默认应为 7d', () => {
      delete process.env.JWT_EXPIRES_IN;
      const config = require('../../../src/common/config/env');
      expect(config.jwt.expiresIn).toBe('7d');
    });

    it('LOG_LEVEL 默认应为 info', () => {
      delete process.env.LOG_LEVEL;
      const config = require('../../../src/common/config/env');
      expect(config.logLevel).toBe('info');
    });

    it('LOG_DIR 默认应包含 logs', () => {
      delete process.env.LOG_DIR;
      const config = require('../../../src/common/config/env');
      expect(config.logDir).toContain('logs');
    });
  });

  describe('环境变量覆盖', () => {
    it('应使用自定义 PORT', () => {
      process.env.PORT = '5000';
      const config = require('../../../src/common/config/env');
      expect(config.port).toBe(5000);
    });

    it('应使用自定义 OA_DB_PORT', () => {
      process.env.OA_DB_PORT = '4000';
      const config = require('../../../src/common/config/env');
      expect(config.oaDb.port).toBe(4000);
    });

    it('应使用自定义 REDIS 配置', () => {
      process.env.REDIS_HOST = 'redis.example.com';
      process.env.REDIS_PORT = '16379';
      process.env.REDIS_PASSWORD = 'secret';
      process.env.REDIS_DB = '1';
      process.env.REDIS_KEY_PREFIX = 'custom:';
      const config = require('../../../src/common/config/env');
      expect(config.redis.host).toBe('redis.example.com');
      expect(config.redis.port).toBe(16379);
      expect(config.redis.password).toBe('secret');
      expect(config.redis.db).toBe(1);
      expect(config.redis.keyPrefix).toBe('custom:');
    });

    it('应使用自定义 LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'debug';
      const config = require('../../../src/common/config/env');
      expect(config.logLevel).toBe('debug');
    });
  });

  describe('环境判断', () => {
    it('NODE_ENV=development 时 isDev 为 true', () => {
      process.env.NODE_ENV = 'development';
      const config = require('../../../src/common/config/env');
      expect(config.isDev).toBe(true);
      expect(config.isProd).toBe(false);
      expect(config.isTest).toBe(false);
    });

    it('NODE_ENV=production 时 isProd 为 true', () => {
      process.env.NODE_ENV = 'production';
      const config = require('../../../src/common/config/env');
      expect(config.isDev).toBe(false);
      expect(config.isProd).toBe(true);
      expect(config.isTest).toBe(false);
    });

    it('NODE_ENV=test 时 isTest 为 true', () => {
      process.env.NODE_ENV = 'test';
      const config = require('../../../src/common/config/env');
      expect(config.isDev).toBe(false);
      expect(config.isProd).toBe(false);
      expect(config.isTest).toBe(true);
    });
  });

  describe('必需变量验证', () => {
    it('缺少 JWT_SECRET 应抛出错误', () => {
      delete process.env.JWT_SECRET;
      expect(() => require('../../../src/common/config/env')).toThrow('缺少必需的环境变量');
    });

    it('缺少 OA_DB_HOST 应抛出错误', () => {
      delete process.env.OA_DB_HOST;
      expect(() => require('../../../src/common/config/env')).toThrow('缺少必需的环境变量');
    });

    it('缺少 WX_APPID 应抛出错误', () => {
      delete process.env.WX_APPID;
      expect(() => require('../../../src/common/config/env')).toThrow('缺少必需的环境变量');
    });

    it('环境变量值为空白字符串时应视为缺失', () => {
      process.env.JWT_SECRET = '   ';
      expect(() => require('../../../src/common/config/env')).toThrow('缺少必需的环境变量');
    });
  });

  describe('可选配置', () => {
    it('SWAGGER_ENABLED=true 时 swaggerEnabled 为 true', () => {
      process.env.SWAGGER_ENABLED = 'true';
      const config = require('../../../src/common/config/env');
      expect(config.swaggerEnabled).toBe(true);
    });

    it('SWAGGER_ENABLED 非 true 时 swaggerEnabled 为 false', () => {
      process.env.SWAGGER_ENABLED = 'false';
      const config = require('../../../src/common/config/env');
      expect(config.swaggerEnabled).toBe(false);
    });

    it('WX_SECRET 默认为空字符串', () => {
      delete process.env.WX_SECRET;
      const config = require('../../../src/common/config/env');
      expect(config.wx.secret).toBe('');
    });
  });

  describe('dotenv 调用', () => {
    it('应调用 dotenv.config()', () => {
      const dotenv = require('dotenv');
      require('../../../src/common/config/env');
      expect(dotenv.config).toHaveBeenCalled();
    });
  });
});
