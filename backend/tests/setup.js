'use strict';

/**
 * 测试环境配置
 * 在所有测试运行前执行
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // 随机端口
process.env.LOG_LEVEL = 'silent'; // 测试时不输出日志
process.env.OA_DB_HOST = '127.0.0.1';
process.env.OA_DB_USER = 'test';
process.env.OA_DB_PASSWORD = 'test';
process.env.OA_DB_NAME = 'test';
process.env.OLD_DB_HOST = '127.0.0.1';
process.env.OLD_DB_USER = 'test';
process.env.OLD_DB_PASSWORD = 'test';
process.env.OLD_DB_NAME = 'test';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.WX_APPID = 'test-appid';
process.env.SWAGGER_ENABLED = 'false';

// 在所有测试之前执行
beforeAll(() => {
  // 全局测试准备
});

// 在所有测试之后执行
afterAll(() => {
  // 全局测试清理
});
