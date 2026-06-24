// tests/cloudfunctions/mysql.test.js - MySQL 连接池模块测试

// 创建一个持久的 mock pool
const mockPool = {
  execute: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
  getConnection: jest.fn().mockResolvedValue({
    ping: jest.fn(),
    release: jest.fn(),
  }),
};

// 模拟 mysql2/promise
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(() => mockPool),
}));

describe('cloudfunctions/common/mysql.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 重置模块缓存
    jest.resetModules();
  });

  describe('getPool', () => {
    test('应该创建并返回连接池', () => {
      const { getPool } = require('../../cloudfunctions/common/mysql');
      const pool = getPool();
      expect(pool).toBeDefined();
    });
  });

  describe('query', () => {
    test('应该执行查询并返回结果行', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPool.execute.mockResolvedValueOnce([mockRows, []]);

      const { query } = require('../../cloudfunctions/common/mysql');
      const result = await query('SELECT * FROM users WHERE id = ?', [1]);

      expect(result).toEqual(mockRows);
    });

    test('应该支持无参数查询', async () => {
      const mockRows = [{ id: 1 }, { id: 2 }];
      mockPool.execute.mockResolvedValueOnce([mockRows, []]);

      const { query } = require('../../cloudfunctions/common/mysql');
      const result = await query('SELECT * FROM users');

      expect(result).toEqual(mockRows);
    });
  });

  describe('queryOne', () => {
    test('应该返回第一行结果', async () => {
      const mockRows = [{ id: 1, name: 'test' }];
      mockPool.execute.mockResolvedValueOnce([mockRows, []]);

      const { queryOne } = require('../../cloudfunctions/common/mysql');
      const result = await queryOne('SELECT * FROM users WHERE id = ?', [1]);

      expect(result).toEqual({ id: 1, name: 'test' });
    });

    test('无结果应返回 null', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      const { queryOne } = require('../../cloudfunctions/common/mysql');
      const result = await queryOne('SELECT * FROM users WHERE id = ?', [999]);

      expect(result).toBeNull();
    });
  });

  describe('execute', () => {
    test('应该执行 INSERT 并返回 affectedRows 和 insertId', async () => {
      const mockResult = { affectedRows: 1, insertId: 123 };
      mockPool.execute.mockResolvedValueOnce([mockResult, []]);

      const { execute } = require('../../cloudfunctions/common/mysql');
      const result = await execute('INSERT INTO users (name) VALUES (?)', ['test']);

      expect(result).toEqual({ affectedRows: 1, insertId: 123 });
    });

    test('应该执行 UPDATE 并返回 affectedRows', async () => {
      const mockResult = { affectedRows: 2, insertId: 0 };
      mockPool.execute.mockResolvedValueOnce([mockResult, []]);

      const { execute } = require('../../cloudfunctions/common/mysql');
      const result = await execute('UPDATE users SET name = ? WHERE id = ?', ['new_name', 1]);

      expect(result).toEqual({ affectedRows: 2, insertId: 0 });
    });
  });

  describe('closePool', () => {
    test('应该关闭连接池', async () => {
      const { getPool, closePool } = require('../../cloudfunctions/common/mysql');
      getPool();
      await closePool();
      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('checkAdmin', () => {
    test('管理员应返回 true', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ is_admin: 1 }], []]);

      const { checkAdmin } = require('../../cloudfunctions/common/mysql');
      const result = await checkAdmin(mockPool, 'admin_openid');

      expect(result).toBe(true);
    });

    test('非管理员应返回 false', async () => {
      mockPool.execute.mockResolvedValueOnce([[{ is_admin: 0 }], []]);

      const { checkAdmin } = require('../../cloudfunctions/common/mysql');
      const result = await checkAdmin(mockPool, 'employee_openid');

      expect(result).toBe(false);
    });

    test('不存在的用户应返回 false', async () => {
      mockPool.execute.mockResolvedValueOnce([[], []]);

      const { checkAdmin } = require('../../cloudfunctions/common/mysql');
      const result = await checkAdmin(mockPool, 'nonexistent_openid');

      expect(result).toBe(false);
    });
  });

  describe('getToday', () => {
    test('应该返回今天的日期字符串 YYYY-MM-DD 格式', () => {
      const { getToday } = require('../../cloudfunctions/common/mysql');
      const result = getToday();

      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      expect(result).toBe(expected);
    });

    test('返回值应该匹配日期格式', () => {
      const { getToday } = require('../../cloudfunctions/common/mysql');
      const result = getToday();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getPoolStatus', () => {
    test('应该返回连接池状态', () => {
      const { getPoolStatus } = require('../../cloudfunctions/common/mysql');
      const status = getPoolStatus();

      expect(status).toHaveProperty('totalConnections');
      expect(status).toHaveProperty('activeConnections');
      expect(status).toHaveProperty('idleConnections');
      expect(status).toHaveProperty('waitingRequests');
    });
  });

  describe('healthCheck', () => {
    test('应该返回健康检查结果', async () => {
      const { healthCheck } = require('../../cloudfunctions/common/mysql');
      const result = await healthCheck();

      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('message');
    });
  });

  describe('resetPool', () => {
    test('应该重置连接池', async () => {
      const { getPool, resetPool } = require('../../cloudfunctions/common/mysql');
      // 先获取连接池以确保它被初始化
      getPool();
      await resetPool();
      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
