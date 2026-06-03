'use strict';

const request = require('supertest');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-secret';
process.env.WX_APPID = 'test-appid';
process.env.SWAGGER_ENABLED = 'false';

const app = require('../../src/app');

describe('健康检查 - GET /api/health', () => {
  it('应返回 200 和正确的响应结构', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/);

    // 无论 DB/Redis 是否正常，响应结构应正确
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('data');
    expect(res.body.code).toBe(0);

    // data 字段结构
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('version');
    expect(res.body.data).toHaveProperty('checks');

    // checks 字段
    expect(res.body.data.checks).toHaveProperty('database');
    expect(res.body.data.checks).toHaveProperty('redis');
    expect(res.body.data.checks.database).toHaveProperty('status');
    expect(res.body.data.checks.redis).toHaveProperty('status');
  });

  it('应返回合法的 timestamp 格式', async () => {
    const res = await request(app).get('/api/health');
    const timestamp = new Date(res.body.data.timestamp);
    expect(timestamp.toISOString()).toBe(res.body.data.timestamp);
  });

  it('应返回合法的 version 字符串', async () => {
    const res = await request(app).get('/api/health');
    expect(typeof res.body.data.version).toBe('string');
    expect(res.body.data.version.length).toBeGreaterThan(0);
  });

  it('uptime 应为正数', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.data.uptime).toBeGreaterThan(0);
  });
});
