'use strict';

const request = require('supertest');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-secret';
process.env.WX_APPID = 'test-appid';
process.env.SWAGGER_ENABLED = 'false';

const app = require('../../src/app');

describe('应用启动测试', () => {
  describe('基础中间件', () => {
    it('应返回 JSON 格式的响应', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/);
      // DB/Redis 未运行时返回 503（degraded），运行正常返回 200
      expect([200, 503]).toContain(res.status);
    });

    it('应包含 Helmet 安全头', async () => {
      const res = await request(app).get('/api/health');
      // Helmet 设置的安全头
      expect(res.headers).toHaveProperty('x-dns-prefetch-control');
      expect(res.headers).toHaveProperty('x-frame-options');
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('CORS 头', () => {
    it('应返回 CORS 头（OPTIONS 预检请求）', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', 'http://localhost:5173')
        .expect(204);
      // 注意：204 无响应体
    });

    it('应允许配置的跨域来源', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'http://localhost:5173');
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('JSON 解析', () => {
    it('应正确解析 JSON 请求体', async () => {
      const res = await request(app)
        .post('/api/health') // POST 返回 404 但解析应正常
        .send({ test: 'data' })
        .set('Content-Type', 'application/json');
      expect(res.status).toBe(404);
    });

    it('应拒绝无效的 JSON', async () => {
      const res = await request(app)
        .post('/api/health')
        .set('Content-Type', 'application/json')
        .send('not json');
      expect(res.status).toBe(400);
    });
  });

  describe('404 路由', () => {
    it('不存在的路由应返回 404', async () => {
      const res = await request(app)
        .get('/api/nonexistent')
        .expect(404);
      expect(res.body).toHaveProperty('code', 1002);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data', null);
    });

    it('不存在的根路径应返回 404', async () => {
      const res = await request(app)
        .get('/nonexistent')
        .expect(404);
      expect(res.body.code).toBe(1002);
    });

    it('不支持的 HTTP 方法应返回 404', async () => {
      const res = await request(app)
        .put('/api/health')
        .expect(404);
      expect(res.body.code).toBe(1002);
    });
  });

  describe('限流中间件', () => {
    it('应允许正常请求通过', async () => {
      const res = await request(app).get('/api/health');
      expect([200, 503]).toContain(res.status);
    });
  });
});
