'use strict';

// Mock logger before requiring errorHandler
jest.mock('../../../src/common/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Mock response util
jest.mock('../../../src/common/utils/response', () => ({
  fail: jest.fn((code, message, data) => ({ code, message, data })),
}));

const errorHandler = require('../../../src/common/middleware/errorHandler');
const logger = require('../../../src/common/utils/logger');
const { fail } = require('../../../src/common/utils/response');
const { AppError, ValidationError, AuthError } = require('../../../src/common/utils/errors');

describe('全局错误处理中间件 - errorHandler.js', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { originalUrl: '/api/test', method: 'GET' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('函数签名', () => {
    it('应有 4 个参数（Express 错误处理中间件）', () => {
      expect(errorHandler.length).toBe(4);
    });
  });

  describe('AppError 子类（客户端错误 4xx）', () => {
    it('ValidationError（400）应记录 warn 并返回 400', () => {
      const err = new ValidationError('参数校验失败', { field: 'email' });

      errorHandler(err, req, res, next);

      // 记录 warn 日志
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('请求错误'),
        expect.objectContaining({ url: '/api/test', method: 'GET' })
      );
      // 返回 400
      expect(res.status).toHaveBeenCalledWith(400);
      expect(fail).toHaveBeenCalledWith(1001, '参数校验失败', { field: 'email' });
    });

    it('AuthError（401）应返回 401 状态码', () => {
      const err = new AuthError('未授权');

      errorHandler(err, req, res, next);

      expect(logger.warn).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(fail).toHaveBeenCalledWith(401, '未授权', null);
    });

    it('应使用 err.data 作为响应 data', () => {
      const errData = { field: 'email' };
      const err = new ValidationError('参数错误', errData);

      errorHandler(err, req, res, next);

      expect(fail).toHaveBeenCalledWith(1001, '参数错误', errData);
    });

    it('err.data 为 null 时响应 data 应为 null', () => {
      const err = new ValidationError('参数错误');

      errorHandler(err, req, res, next);

      expect(fail).toHaveBeenCalledWith(1001, '参数错误', null);
    });
  });

  describe('AppError 子类（服务器错误 5xx）', () => {
    it('httpStatus >= 500 时应记录 error 日志（含完整堆栈）', () => {
      const err = new AppError(500, 5000, '数据库连接失败');

      errorHandler(err, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        '服务器内部错误',
        expect.objectContaining({
          error: '数据库连接失败',
          stack: expect.any(String),
          url: '/api/test',
          method: 'GET',
          code: 5000,
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('未知错误（非 AppError）', () => {
    it('普通 Error 应返回 500', () => {
      const err = new Error('未知错误');

      errorHandler(err, req, res, next);

      expect(logger.error).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(fail).toHaveBeenCalledWith(500, '未知错误', null);
    });

    it('非生产环境应暴露错误详情', () => {
      const err = new Error('连接数据库超时');

      errorHandler(err, req, res, next);

      expect(fail).toHaveBeenCalledWith(500, '连接数据库超时', null);
    });
  });

  describe('生产环境行为', () => {
    const OLD_ENV = process.env.NODE_ENV;

    beforeEach(() => {
      jest.resetModules();
    });

    afterEach(() => {
      process.env.NODE_ENV = OLD_ENV;
    });

    it('生产环境不应暴露未知错误的详情', () => {
      process.env.NODE_ENV = 'production';

      // 重新加载 errorHandler 以读取新的 NODE_ENV
      const errorHandlerProd = require('../../../src/common/middleware/errorHandler');

      // 清除之前测试的 mock 调用记录
      jest.clearAllMocks();

      const err = new Error('内部敏感信息');

      errorHandlerProd(err, req, res, next);

      // 生产环境用通用消息（通过 res.json 验证，避免 resetModules 后 mock 引用失效）
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 500,
          message: '服务器内部错误，请稍后重试',
        })
      );
    });
  });
});
