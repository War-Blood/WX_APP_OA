'use strict';

const request = require('supertest');

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-jwt-secret-for-unit-tests';
process.env.WX_APPID = 'test-appid';
process.env.SWAGGER_ENABLED = 'false';

const app = require('../../src/app');

describe('合规管理 API 集成测试', () => {
  let adminToken;
  let userToken;
  let testTripId;

  beforeAll(async () => {
    // 获取管理员token
    try {
      const adminLoginRes = await request(app)
        .post('/api/auth/admin/login')
        .send({ username: 'admin', password: 'admin123' });
      
      if (adminLoginRes.body.code === 0) {
        adminToken = adminLoginRes.body.data.token;
      }
    } catch (err) {
      console.warn('管理员登录失败,部分测试可能跳过:', err.message);
    }

    // 获取普通用户token
    try {
      const userLoginRes = await request(app)
        .post('/api/auth/login')
        .send({ code: 'test_code' });
      
      if (userLoginRes.body.code === 0) {
        userToken = userLoginRes.body.data.token;
      }
    } catch (err) {
      console.warn('用户登录失败,部分测试可能跳过:', err.message);
    }
  });

  describe('路由注册检查', () => {
    it('应注册 /api/compliance 路由(返回401表示需要认证)', async () => {
      const res = await request(app).get('/api/compliance/my-compliance');
      expect(res.status).toBe(401);
    });
  });

  describe('出差状态管理', () => {
    if (!adminToken) {
      it.skip('需要管理员token才能测试', () => {});
      return;
    }

    it('POST /api/compliance/biz-trip - 设置出差状态', async () => {
      const res = await request(app)
        .post('/api/compliance/biz-trip')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: 1,
          projectName: '测试项目',
          startDate: '2026-06-01'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('id');
      
      // 保存用于后续测试
      testTripId = res.body.data.id;
    });

    it('GET /api/compliance/biz-trip/list - 获取出差列表', async () => {
      const res = await request(app)
        .get('/api/compliance/biz-trip/list?status=active&page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('list');
      expect(res.body.data).toHaveProperty('total');
      expect(Array.isArray(res.body.data.list)).toBe(true);
    });

    it('PUT /api/compliance/biz-trip/:id/end - 结束出差', async () => {
      if (!testTripId) {
        // 先创建一个出差记录
        const createRes = await request(app)
          .post('/api/compliance/biz-trip')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ userId: 1, startDate: '2026-06-01' });
        
        testTripId = createRes.body.data.id;
      }
      
      const res = await request(app)
        .put(`/api/compliance/biz-trip/${testTripId}/end`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ endDate: '2026-06-03' });
      
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('GET /api/compliance/biz-trip/check-status - 检查出差状态(需用户token)', async () => {
      if (!userToken) {
        console.warn('跳过: 无用户token');
        return;
      }

      const res = await request(app)
        .get('/api/compliance/biz-trip/check-status')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('isOnTrip');
    });
  });

  describe('合规检查接口', () => {
    if (!userToken) {
      it.skip('需要用户token才能测试', () => {});
      return;
    }

    it('GET /api/compliance/my-compliance - 获取我的合规记录', async () => {
      const res = await request(app)
        .get('/api/compliance/my-compliance')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('stats');
      expect(res.body.data).toHaveProperty('records');
    });
  });

  describe('缺失报告审核', () => {
    if (!adminToken) {
      it.skip('需要管理员token才能测试', () => {});
      return;
    }

    it('GET /api/compliance/missing-reports - 获取缺失报告列表', async () => {
      const res = await request(app)
        .get('/api/compliance/missing-reports?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('list');
      expect(res.body.data).toHaveProperty('total');
    });

    it('PUT /api/compliance/timeliness/:id - 更新及时性标记', async () => {
      // 尝试更新一个可能不存在的记录,预期返回200或404
      const res = await request(app)
        .put('/api/compliance/timeliness/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ timeliness: 'on_time' });
      
      expect([200, 404]).toContain(res.status);
      
      if (res.status === 200) {
        expect(res.body.code).toBe(0);
      }
    });
  });

  describe('统计看板', () => {
    if (!adminToken) {
      it.skip('需要管理员token才能测试', () => {});
      return;
    }

    it('GET /api/compliance/stats/dashboard - 获取合规统计看板', async () => {
      const res = await request(app)
        .get('/api/compliance/stats/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveProperty('overallRate');
      expect(res.body.data).toHaveProperty('departmentRanking');
      expect(res.body.data).toHaveProperty('missingTop10');
    });
  });

  describe('权限控制', () => {
    it('POST /api/compliance/biz-trip - 无token应返回401', async () => {
      const res = await request(app)
        .post('/api/compliance/biz-trip')
        .send({ userId: 1, startDate: '2026-06-01' });
      
      expect(res.status).toBe(401);
    });

    it('GET /api/compliance/missing-reports - 普通用户应无权访问', async () => {
      if (!userToken) {
        console.warn('跳过: 无用户token');
        return;
      }

      const res = await request(app)
        .get('/api/compliance/missing-reports')
        .set('Authorization', `Bearer ${userToken}`);
      
      // 应返回403 Forbidden
      expect(res.status).toBe(403);
    });
  });

  describe('参数验证', () => {
    if (!adminToken) {
      it.skip('需要管理员token才能测试', () => {});
      return;
    }

    it('POST /api/compliance/biz-trip - 缺少必填参数应返回错误', async () => {
      const res = await request(app)
        .post('/api/compliance/biz-trip')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({}); // 缺少userId和startDate
      
      expect(res.status).toBe(400);
    });

    it('PUT /api/compliance/timeliness/:id - 无效的timeliness值应返回错误', async () => {
      const res = await request(app)
        .put('/api/compliance/timeliness/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ timeliness: 'invalid_value' });
      
      expect(res.status).toBe(400);
    });
  });
});
