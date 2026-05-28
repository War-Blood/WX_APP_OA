// tests/cloudfunctions/auth.test.js - 权限检查模块测试

// 模拟 mysql2/promise
jest.mock('mysql2/promise', () => ({
  createPool: jest.fn(),
}));

const {
  checkAdmin,
  userExists,
  getUserInfo,
  requireAdmin,
  checkReportOwner,
  checkProjectReportOwner,
} = require('../../cloudfunctions/common/auth');

describe('cloudfunctions/common/auth.js', () => {
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();

    // 创建模拟的连接池
    mockPool = {
      execute: jest.fn(),
    };
  });

  describe('checkAdmin', () => {
    test('管理员应返回 true', async () => {
      mockPool.execute.mockResolvedValue([[{ is_admin: 1 }], []]);

      const result = await checkAdmin(mockPool, 'admin_openid');

      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT is_admin FROM users WHERE openid = ?',
        ['admin_openid']
      );
    });

    test('非管理员应返回 false', async () => {
      mockPool.execute.mockResolvedValue([[{ is_admin: 0 }], []]);

      const result = await checkAdmin(mockPool, 'employee_openid');

      expect(result).toBe(false);
    });

    test('不存在的用户应返回 false', async () => {
      mockPool.execute.mockResolvedValue([[], []]);

      const result = await checkAdmin(mockPool, 'nonexistent_openid');

      expect(result).toBe(false);
    });

    test('is_admin 为 null 应返回 false', async () => {
      mockPool.execute.mockResolvedValue([[{ is_admin: null }], []]);

      const result = await checkAdmin(mockPool, 'user_openid');

      expect(result).toBe(false);
    });
  });

  describe('userExists', () => {
    test('存在的用户应返回 true', async () => {
      mockPool.execute.mockResolvedValue([[{ openid: 'test_openid' }], []]);

      const result = await userExists(mockPool, 'test_openid');

      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT openid FROM users WHERE openid = ?',
        ['test_openid']
      );
    });

    test('不存在的用户应返回 false', async () => {
      mockPool.execute.mockResolvedValue([[], []]);

      const result = await userExists(mockPool, 'nonexistent_openid');

      expect(result).toBe(false);
    });
  });

  describe('getUserInfo', () => {
    test('应该返回用户信息', async () => {
      const mockUserInfo = {
        openid: 'test_openid',
        user_name: '张三',
        department: '技术部',
        is_admin: 0,
        created_at: '2024-01-01',
      };
      mockPool.execute.mockResolvedValue([[mockUserInfo], []]);

      const result = await getUserInfo(mockPool, 'test_openid');

      expect(result).toEqual(mockUserInfo);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT openid, user_name, department, is_admin, created_at FROM users WHERE openid = ?',
        ['test_openid']
      );
    });

    test('不存在的用户应返回 null', async () => {
      mockPool.execute.mockResolvedValue([[], []]);

      const result = await getUserInfo(mockPool, 'nonexistent_openid');

      expect(result).toBeNull();
    });
  });

  describe('requireAdmin', () => {
    test('管理员应返回成功', async () => {
      mockPool.execute.mockResolvedValue([[{ is_admin: 1 }], []]);

      const result = await requireAdmin(mockPool, 'admin_openid');

      expect(result).toEqual({ success: true, message: '' });
    });

    test('非管理员应返回失败', async () => {
      mockPool.execute.mockResolvedValue([[{ is_admin: 0 }], []]);

      const result = await requireAdmin(mockPool, 'employee_openid');

      expect(result).toEqual({
        success: false,
        message: '无管理员权限',
        code: 403,
      });
    });

    test('不存在的用户应返回失败', async () => {
      mockPool.execute.mockResolvedValue([[], []]);

      const result = await requireAdmin(mockPool, 'nonexistent_openid');

      expect(result.success).toBe(false);
      expect(result.code).toBe(403);
    });
  });

  describe('checkReportOwner', () => {
    test('所有者应返回 true', async () => {
      mockPool.execute.mockResolvedValue([[{ user_id: 'test_openid' }], []]);

      const result = await checkReportOwner(mockPool, 123, 'test_openid');

      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT user_id FROM daily_reports WHERE report_id = ?',
        [123]
      );
    });

    test('非所有者应返回 false', async () => {
      mockPool.execute.mockResolvedValue([[{ user_id: 'other_openid' }], []]);

      const result = await checkReportOwner(mockPool, 123, 'test_openid');

      expect(result).toBe(false);
    });

    test('不存在的日报应返回 false', async () => {
      mockPool.execute.mockResolvedValue([[], []]);

      const result = await checkReportOwner(mockPool, 999, 'test_openid');

      expect(result).toBe(false);
    });
  });

  describe('checkProjectReportOwner', () => {
    test('所有者应返回 true', async () => {
      mockPool.execute.mockResolvedValue([[{ filler_name: '张三' }], []]);

      const result = await checkProjectReportOwner(mockPool, 123, '张三');

      expect(result).toBe(true);
      expect(mockPool.execute).toHaveBeenCalledWith(
        'SELECT filler_name FROM project_daily WHERE id = ?',
        [123]
      );
    });

    test('非所有者应返回 false', async () => {
      mockPool.execute.mockResolvedValue([[{ filler_name: '李四' }], []]);

      const result = await checkProjectReportOwner(mockPool, 123, '张三');

      expect(result).toBe(false);
    });

    test('不存在的项目日报应返回 false', async () => {
      mockPool.execute.mockResolvedValue([[], []]);

      const result = await checkProjectReportOwner(mockPool, 999, '张三');

      expect(result).toBe(false);
    });
  });
});
