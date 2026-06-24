'use strict';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// mock 客户端实例（前缀 mock 允许在 jest.mock 工厂中使用）
const mockClient = {
  isOpen: false,
  connect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),
  on: jest.fn(),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockClient),
}));

jest.mock('../../../src/common/config/env', () => ({
  redis: {
    host: '127.0.0.1',
    port: 6379,
    password: '',
    db: 0,
    keyPrefix: 'oa:',
  },
  logLevel: 'silent',
}));

jest.mock('../../../src/common/utils/logger', () => mockLogger);

describe('Redis 配置 - redis.js', () => {
  let redisModule;

  beforeAll(() => {
    redisModule = require('../../../src/common/config/redis');
  });

  beforeEach(() => {
    // 只清除我们自己跟踪的 mock，保留 redis.createClient 实现
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.error.mockClear();
    mockLogger.debug.mockClear();
    mockClient.connect.mockClear();
    mockClient.quit.mockClear();
    mockClient.ping.mockClear();
    mockClient.on.mockClear();
    mockClient.isOpen = false;
    // 确保 createClient 仍然返回 mockClient，但清除上次调用的记录
    const redis = require('redis');
    redis.createClient.mockClear();
    redis.createClient.mockReturnValue(mockClient);
  });

  describe('initRedis', () => {
    it('应创建 Redis 客户端并连接', async () => {
      mockClient.isOpen = false;
      mockClient.connect.mockResolvedValue(undefined);

      const client = await redisModule.initRedis();

      expect(client).toBe(mockClient);
      const redis = require('redis');
      expect(redis.createClient).toHaveBeenCalled();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    it('客户端已连接时应直接返回', async () => {
      mockClient.isOpen = true;

      const client = await redisModule.initRedis();

      expect(client).toBe(mockClient);
      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    it('无密码时应使用不带密码的 URL', async () => {
      await redisModule.initRedis();

      const redis = require('redis');
      const createCall = redis.createClient.mock.calls[0][0];
      expect(createCall.url).toBe('redis://127.0.0.1:6379/0');
    });

    it('连接成功应触发 connect 事件日志', async () => {
      mockClient.on.mockImplementation((event, handler) => {
        if (event === 'connect') handler();
      });

      await redisModule.initRedis();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Redis 连接成功',
        expect.objectContaining({ module: 'redis' })
      );
    });

    it('连接错误应触发 error 事件日志', async () => {
      mockClient.on.mockImplementation((event, handler) => {
        if (event === 'error') handler(new Error('ECONNREFUSED'));
      });

      await redisModule.initRedis();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis 连接错误',
        expect.objectContaining({ module: 'redis', error: 'ECONNREFUSED' })
      );
    });

    it('连接关闭应触发 end 事件日志', async () => {
      mockClient.on.mockImplementation((event, handler) => {
        if (event === 'end') handler();
      });

      await redisModule.initRedis();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Redis 连接关闭',
        expect.objectContaining({ module: 'redis' })
      );
    });

    it('重连策略应随次数递增', async () => {
      await redisModule.initRedis();

      const redis = require('redis');
      const createCall = redis.createClient.mock.calls[0][0];
      const strategy = createCall.socket.reconnectStrategy;

      expect(strategy(1)).toBe(100);   // 1 * 100 = 100
      expect(strategy(5)).toBe(500);   // 5 * 100 = 500
      expect(strategy(10)).toBe(1000); // 10 * 100 = 1000
    });

    it('重连超过 10 次应返回错误', async () => {
      await redisModule.initRedis();

      const redis = require('redis');
      const createCall = redis.createClient.mock.calls[0][0];
      const strategy = createCall.socket.reconnectStrategy;

      const result = strategy(11);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Redis 重连失败');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Redis 重连次数超过上限',
        expect.objectContaining({ module: 'redis' })
      );
    });
  });

  describe('getClient', () => {
    it('已初始化应返回客户端', () => {
      mockClient.isOpen = true;

      const client = redisModule.getClient();
      expect(client).toBe(mockClient);
    });

    it('未初始化应抛出错误', () => {
      // 模块加载后 client = null（initRedis 未调用）
      expect(() => redisModule.getClient()).toThrow('Redis 客户端未初始化，请先调用 initRedis()');
    });
  });

  describe('closeRedis', () => {
    it('应关闭客户端连接', async () => {
      mockClient.isOpen = true;

      await redisModule.closeRedis();

      expect(mockClient.quit).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Redis 连接已关闭',
        expect.objectContaining({ module: 'redis' })
      );
    });

    it('客户端已关闭时不应调用 quit', async () => {
      await redisModule.closeRedis();
      expect(mockClient.quit).not.toHaveBeenCalled();
    });
  });

  describe('ping', () => {
    it('客户端已连接应返回 true', async () => {
      mockClient.isOpen = true;
      const result = await redisModule.ping();
      expect(result).toBe(true);
    });

    it('客户端未连接应返回 false', async () => {
      const result = await redisModule.ping();
      expect(result).toBe(false);
    });

    it('ping 失败应返回 false', async () => {
      mockClient.isOpen = true;
      mockClient.ping.mockRejectedValue(new Error('timeout'));

      const result = await redisModule.ping();
      expect(result).toBe(false);
    });
  });
});
