'use strict';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-secret';
process.env.WX_APPID = 'test-appid';
process.env.SWAGGER_ENABLED = 'false';

const request = require('supertest');
const app = require('../../src/app');

describe('API 路由集成测试', () => {
  test('POST /api/report/list 无 token 应返回 401', async () => {
    const res = await request(app).post('/api/report/list').send({});
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });

  test('POST /api/approval/list 无 token 应返回 401', async () => {
    const res = await request(app).post('/api/approval/list').send({});
    expect(res.status).toBe(401);
  });

  test('POST /api/message/list 无 token 应返回 401', async () => {
    const res = await request(app).post('/api/message/list').send({});
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/login 无 code 应返回 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});
