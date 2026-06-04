'use strict';

jest.mock('jsonwebtoken');

jest.mock('../../../src/common/config/env', () => ({
  jwt: { secret: 'test-secret' },
  nodeEnv: 'test',
  isTest: true,
  logDir: './logs',
  oaDb: {
    host: '127.0.0.1',
    port: 3306,
    user: 'test',
    password: 'test',
    name: 'test',
    poolMin: 1,
    poolMax: 2,
  },
  oldDb: {
    host: '127.0.0.1',
    port: 3306,
    user: 'test',
    password: 'test',
    name: 'test',
    poolMin: 1,
    poolMax: 2,
  },
}));

jest.mock('../../../src/common/config/database', () => ({
  query: jest.fn(),
}));

const jwt = require('jsonwebtoken');
const db = require('../../../src/common/config/database');
const { authenticate, requireRole } = require('../../../src/common/middleware/auth');
const { AuthError, ForbiddenError } = require('../../../src/common/utils/errors');

describe('认证鉴权中间件 - auth.js', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { headers: {}, user: null };
    res = {};
    next = jest.fn();
    // Default mock: return active user
    db.query.mockResolvedValue([{ status: 'active', role: 'admin' }]);
  });

  describe('authenticate（JWT 认证）', () => {
    it('无 Authorization 头时应返回 401', () => {
      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthError);
      expect(err.httpStatus).toBe(401);
      expect(err.message).toBe('未提供有效的认证令牌');
    });

    it('Authorization 头不是 Bearer 格式时应返回 401', () => {
      req.headers.authorization = 'Basic xyz123';

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthError);
      expect(err.httpStatus).toBe(401);
    });

    it('无效 token 时应返回 401', () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthError);
      expect(err.message).toBe('无效的 Token');
    });

    it('Token 过期时应返回特定消息', () => {
      req.headers.authorization = 'Bearer expired-token';
      const tokenExpiredError = new Error('jwt expired');
      tokenExpiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw tokenExpiredError;
      });

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthError);
      expect(err.message).toBe('Token 已过期，请重新登录');
    });

    it('有效 token 时应挂载 req.user 并调用 next()', async () => {
      req.headers.authorization = 'Bearer valid-token';
      const decodedPayload = { id: 1, username: 'testuser', role: 'admin' };
      jwt.verify.mockReturnValue(decodedPayload);

      await authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(req.user).toEqual(decodedPayload);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // 无参数
    });

    it('应使用 config 中的 jwt.secret 验证 token', async () => {
      req.headers.authorization = 'Bearer token123';
      jwt.verify.mockReturnValue({ id: 1 });

      await authenticate(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('token123', 'test-secret');
    });
  });

  describe('requireRole（角色鉴权）', () => {
    it('未认证（无 req.user）时应返回 401', () => {
      req.user = undefined;
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AuthError);
      expect(err.httpStatus).toBe(401);
      expect(err.message).toBe('未认证，请先登录');
    });

    it('角色不匹配时应返回 403', () => {
      req.user = { role: 'employee' };
      const middleware = requireRole('admin', 'superadmin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ForbiddenError);
      expect(err.httpStatus).toBe(403);
      expect(err.message).toBe('无权限执行此操作');
    });

    it('角色匹配时应调用 next() 通过', () => {
      req.user = { role: 'admin' };
      const middleware = requireRole('admin', 'superadmin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('superadmin 不在允许角色列表中应返回 403', () => {
      req.user = { role: 'superadmin' };
      const middleware = requireRole('admin'); // superadmin 不在列表中

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(ForbiddenError);
    });

    it('superadmin 在允许角色列表中时应通过', () => {
      req.user = { role: 'superadmin' };
      const middleware = requireRole('admin', 'superadmin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('支持单个角色参数', () => {
      req.user = { role: 'admin' };
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
