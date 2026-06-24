'use strict';

const mockLoggerInstance = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('winston', () => {
  const identityFn = jest.fn(() => jest.fn());
  return {
    format: {
      printf: jest.fn(() => jest.fn()),
      combine: jest.fn(() => identityFn),
      timestamp: jest.fn(() => identityFn),
      errors: jest.fn(() => identityFn),
      json: jest.fn(() => identityFn),
      colorize: jest.fn(() => identityFn),
    },
    createLogger: jest.fn(() => mockLoggerInstance),
    transports: {
      Console: jest.fn(),
      File: jest.fn(),
    },
  };
});

// Mock config/env to avoid env validation at module load time
jest.mock('../../../src/common/config/env', () => ({
  logLevel: 'info',
  logDir: './logs',
  nodeEnv: 'test',
}));

const loggerModule = require('../../../src/common/utils/logger');
const winston = require('winston');

describe('日志工具 - logger.js', () => {
  describe('模块加载', () => {
    it('应通过 winston.createLogger 创建日志实例', () => {
      expect(winston.createLogger).toHaveBeenCalledTimes(1);
      expect(winston.createLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'info',
          silent: false,
        })
      );
    });

    it('createLogger 应包含 Console 和 File 两种 transports', () => {
      const createLoggerArgs = winston.createLogger.mock.calls[0][0];
      expect(createLoggerArgs.transports).toBeDefined();
      expect(Array.isArray(createLoggerArgs.transports)).toBe(true);
      expect(createLoggerArgs.transports.length).toBe(3); // Console + error.log + combined.log
    });
  });

  describe('logger 实例方法', () => {
    beforeEach(() => {
      mockLoggerInstance.info.mockClear();
      mockLoggerInstance.warn.mockClear();
      mockLoggerInstance.error.mockClear();
      mockLoggerInstance.debug.mockClear();
    });

    it('应包含 info / warn / error / debug 方法', () => {
      expect(typeof loggerModule.info).toBe('function');
      expect(typeof loggerModule.warn).toBe('function');
      expect(typeof loggerModule.error).toBe('function');
      expect(typeof loggerModule.debug).toBe('function');
    });

    it('info 方法应委托给底层 logger', () => {
      loggerModule.info('用户登录成功');
      expect(mockLoggerInstance.info).toHaveBeenCalledWith('用户登录成功');
    });

    it('error 方法应委托给底层 logger', () => {
      loggerModule.error('数据库连接失败');
      expect(mockLoggerInstance.error).toHaveBeenCalledWith('数据库连接失败');
    });

    it('warn 方法应委托给底层 logger', () => {
      loggerModule.warn('请求频率过高');
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith('请求频率过高');
    });

    it('debug 方法应委托给底层 logger', () => {
      loggerModule.debug('查询耗时 15ms');
      expect(mockLoggerInstance.debug).toHaveBeenCalledWith('查询耗时 15ms');
    });
  });

  describe('requestLogger 中间件', () => {
    beforeEach(() => {
      mockLoggerInstance.info.mockClear();
      mockLoggerInstance.warn.mockClear();
      mockLoggerInstance.error.mockClear();
      mockLoggerInstance.debug.mockClear();
    });

    it('应作为命名导出存在，且为 3 参数函数', () => {
      expect(loggerModule.requestLogger).toBeDefined();
      expect(typeof loggerModule.requestLogger).toBe('function');
      expect(loggerModule.requestLogger.length).toBe(3);
    });

    it('应在 req 上挂载 logger 并调用 next()', () => {
      const req = {
        headers: {},
        get: jest.fn().mockReturnValue('test-agent'),
        method: 'GET',
        originalUrl: '/api/test',
        id: 'req-001',
        ip: '127.0.0.1',
      };
      const res = { on: jest.fn(), statusCode: 200 };
      const next = jest.fn();

      loggerModule.requestLogger(req, res, next);

      expect(req.logger).toBeDefined();
      expect(typeof req.logger.info).toBe('function');
      expect(typeof req.logger.warn).toBe('function');
      expect(typeof req.logger.error).toBe('function');
      expect(typeof req.logger.debug).toBe('function');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('应在请求进入时记录日志', () => {
      const req = {
        headers: {},
        get: jest.fn().mockReturnValue('test-agent'),
        method: 'GET',
        originalUrl: '/api/test',
        id: 'req-001',
        ip: '127.0.0.1',
      };
      const res = { on: jest.fn(), statusCode: 200 };
      const next = jest.fn();

      loggerModule.requestLogger(req, res, next);

      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        'GET /api/test',
        expect.objectContaining({ module: 'HTTP', ip: '127.0.0.1' })
      );
    });

    it('应在 finish 事件监听响应完成日志', () => {
      let finishHandler;
      const req = {
        headers: {},
        get: jest.fn(),
        method: 'GET',
        originalUrl: '/api/health',
        id: 'req-003',
        ip: '10.0.0.1',
      };
      const res = {
        on: jest.fn((event, handler) => {
          if (event === 'finish') finishHandler = handler;
        }),
        statusCode: 200,
      };
      const next = jest.fn();

      loggerModule.requestLogger(req, res, next);
      expect(finishHandler).toBeDefined();
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));

      // 触发 finish 事件
      finishHandler();

      // 验证响应完成日志包含状态码
      const finishLog = mockLoggerInstance.info.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('200')
      );
      expect(finishLog).toBeDefined();
      expect(finishLog[0]).toContain('GET /api/health 200');
      expect(finishLog[1]).toHaveProperty('duration');
    });

    it('req.logger 方法应注入请求上下文', () => {
      const req = {
        headers: {},
        get: jest.fn(),
        method: 'POST',
        originalUrl: '/api/user',
        id: 'req-002',
        ip: '192.168.1.1',
      };
      const res = { on: jest.fn(), statusCode: 201 };
      const next = jest.fn();

      loggerModule.requestLogger(req, res, next);

      req.logger.info('用户创建成功', { userId: 1 });
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        '用户创建成功',
        expect.objectContaining({
          userId: 1,
          requestId: 'req-002',
          url: '/api/user',
          method: 'POST',
        })
      );
    });
  });
});
