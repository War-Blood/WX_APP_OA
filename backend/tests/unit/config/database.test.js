'use strict';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// 共享的 mock 池实例（前缀 mock 允许在 jest.mock 工厂中使用）
const mockOaPool = {
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
};

const mockOldPool = {
  getConnection: jest.fn(),
  query: jest.fn(),
  execute: jest.fn(),
};

let mockPoolCallCount = 0;

jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => {
    mockPoolCallCount++;
    return mockPoolCallCount === 1 ? mockOaPool : mockOldPool;
  }),
}));

jest.mock('../../../src/common/config/env', () => ({
  oaDb: { host: 'oa-host', port: 3306, user: 'oa_user', password: 'oa_pass', name: 'oa_db', poolMin: 2, poolMax: 10 },
  oldDb: { host: 'old-host', port: 3306, user: 'old_user', password: 'old_pass', name: 'old_db', poolMin: 1, poolMax: 5 },
}));

jest.mock('../../../src/common/utils/logger', () => mockLogger);

describe('数据库连接池 - database.js', () => {
  let database;

  beforeAll(() => {
    database = require('../../../src/common/config/database');
  });

  // 模块加载类测试不使用 clearAllMocks，保留模块加载时的调用记录
  describe('模块加载', () => {
    it('应创建 OA 和 OLD 两个连接池', () => {
      const mysql = require('mysql2/promise');
      expect(mysql.createPool).toHaveBeenCalledTimes(2);
    });

    it('OA 池应使用 oaDb 配置', () => {
      const mysql = require('mysql2/promise');
      expect(mysql.createPool).toHaveBeenNthCalledWith(1,
        expect.objectContaining({
          host: 'oa-host',
          database: 'oa_db',
          user: 'oa_user',
        })
      );
    });

    it('OLD 池应使用 oldDb 配置', () => {
      const mysql = require('mysql2/promise');
      expect(mysql.createPool).toHaveBeenNthCalledWith(2,
        expect.objectContaining({
          host: 'old-host',
          database: 'old_db',
          user: 'old_user',
        })
      );
    });
  });

  // 运行时测试在 beforeEach 中清除 mock 调用记录
  describe('运行时方法', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('getConnection', () => {
      it('应返回 OA 池的连接', async () => {
        const fakeConn = { release: jest.fn() };
        mockOaPool.getConnection.mockResolvedValue(fakeConn);

        const conn = await database.getConnection();
        expect(conn).toBe(fakeConn);
        expect(mockOaPool.getConnection).toHaveBeenCalled();
      });
    });

    describe('getOldConnection', () => {
      it('应返回旧版池的连接', async () => {
        const fakeConn = { release: jest.fn() };
        mockOldPool.getConnection.mockResolvedValue(fakeConn);

        const conn = await database.getOldConnection();
        expect(conn).toBe(fakeConn);
        expect(mockOldPool.getConnection).toHaveBeenCalled();
      });
    });

    describe('query（OA 库查询）', () => {
      it('查询成功应返回行数据', async () => {
        const mockRows = [{ id: 1, name: 'test' }];
        mockOaPool.query.mockResolvedValue([mockRows]);

        const result = await database.query('SELECT * FROM users WHERE id = ?', [1]);
        expect(result).toBe(mockRows);
        expect(mockOaPool.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = ?', [1]);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'DB 查询成功',
          expect.objectContaining({ module: 'database' })
        );
      });

      it('查询失败应抛出并记录 error', async () => {
        const dbError = new Error('Connection lost');
        mockOaPool.query.mockRejectedValue(dbError);

        await expect(database.query('SELECT * FROM users')).rejects.toThrow('Connection lost');
        expect(mockLogger.error).toHaveBeenCalledWith(
          'DB 查询失败',
          expect.objectContaining({ module: 'database', error: 'Connection lost' })
        );
      });

      it('params 默认为空数组', async () => {
        mockOaPool.query.mockResolvedValue([[]]);
        await database.query('SELECT 1');
        expect(mockOaPool.query).toHaveBeenCalledWith('SELECT 1', []);
      });
    });

    describe('execute（OA 库执行）', () => {
      it('执行成功应返回结果', async () => {
        const mockResult = [{ affectedRows: 1 }];
        mockOaPool.execute.mockResolvedValue(mockResult);

        const result = await database.execute('INSERT INTO users (name) VALUES (?)', ['test']);
        expect(result).toBe(mockResult);
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'DB 执行成功',
          expect.objectContaining({ module: 'database' })
        );
      });

      it('执行失败应抛出并记录 error', async () => {
        mockOaPool.execute.mockRejectedValue(new Error('Duplicate entry'));
        await expect(database.execute('INSERT INTO users (name) VALUES (?)', ['test']))
          .rejects.toThrow('Duplicate entry');
        expect(mockLogger.error).toHaveBeenCalled();
      });
    });

    describe('oldQuery（旧版库查询）', () => {
      it('查询成功应记录日志', async () => {
        mockOldPool.query.mockResolvedValue([[]]);
        await database.oldQuery('SELECT 1');
        expect(mockOldPool.query).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '旧版DB查询成功',
          expect.objectContaining({ module: 'database' })
        );
      });

      it('查询失败应记录 error', async () => {
        mockOldPool.query.mockRejectedValue(new Error('timeout'));
        await expect(database.oldQuery('SELECT 1')).rejects.toThrow('timeout');
        expect(mockLogger.error).toHaveBeenCalledWith(
          '旧版DB查询失败',
          expect.objectContaining({ module: 'database' })
        );
      });
    });

    describe('oldExecute（旧版库执行）', () => {
      it('执行成功应记录日志', async () => {
        mockOldPool.execute.mockResolvedValue([{ affectedRows: 1 }]);
        await database.oldExecute('UPDATE users SET name=? WHERE id=?', ['new', 1]);
        expect(mockOldPool.execute).toHaveBeenCalled();
        expect(mockLogger.debug).toHaveBeenCalledWith(
          '旧版DB执行成功',
          expect.objectContaining({ module: 'database' })
        );
      });

      it('执行失败应记录 error', async () => {
        mockOldPool.execute.mockRejectedValue(new Error('constraint'));
        await expect(database.oldExecute('UPDATE users SET name=?', ['x'])).rejects.toThrow('constraint');
        expect(mockLogger.error).toHaveBeenCalledWith(
          '旧版DB执行失败',
          expect.objectContaining({ module: 'database' })
        );
      });
    });

    describe('transaction', () => {
      it('成功时应提交事务并返回结果', async () => {
        const mockConn = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn(),
        };
        mockOaPool.getConnection.mockResolvedValue(mockConn);
        const callback = jest.fn().mockResolvedValue('tx-result');

        const result = await database.transaction(callback);

        expect(result).toBe('tx-result');
        expect(mockConn.beginTransaction).toHaveBeenCalled();
        expect(mockConn.commit).toHaveBeenCalled();
        expect(mockConn.rollback).not.toHaveBeenCalled();
        expect(mockConn.release).toHaveBeenCalled();
      });

      it('失败时应回滚事务并抛出', async () => {
        const mockConn = {
          beginTransaction: jest.fn(),
          commit: jest.fn(),
          rollback: jest.fn(),
          release: jest.fn(),
        };
        mockOaPool.getConnection.mockResolvedValue(mockConn);
        const callback = jest.fn().mockRejectedValue(new Error('tx failed'));

        await expect(database.transaction(callback)).rejects.toThrow('tx failed');
        expect(mockConn.rollback).toHaveBeenCalled();
        expect(mockConn.commit).not.toHaveBeenCalled();
        expect(mockConn.release).toHaveBeenCalled();
      });
    });

    describe('ping', () => {
      it('查询成功应返回 true', async () => {
        mockOaPool.query.mockResolvedValue([[{ 1: 1 }]]);
        const result = await database.ping();
        expect(result).toBe(true);
        expect(mockOaPool.query).toHaveBeenCalledWith('SELECT 1');
      });

      it('查询失败应返回 false', async () => {
        mockOaPool.query.mockRejectedValue(new Error('connection refused'));
        const result = await database.ping();
        expect(result).toBe(false);
      });
    });

    describe('oldPing', () => {
      it('旧版库查询成功应返回 true', async () => {
        mockOldPool.query.mockResolvedValue([[{ 1: 1 }]]);
        const result = await database.oldPing();
        expect(result).toBe(true);
      });

      it('旧版库查询失败应返回 false', async () => {
        mockOldPool.query.mockRejectedValue(new Error('timeout'));
        const result = await database.oldPing();
        expect(result).toBe(false);
      });
    });
  });
});
