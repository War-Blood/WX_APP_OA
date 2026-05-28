// tests/utils/cache.test.js - 缓存工具函数测试

const {
  set,
  get,
  remove,
  clearAll,
  clearExpired,
  setUserInfo,
  getUserInfo,
  setReviewStats,
  getReviewStats,
  setReviewList,
  getReviewList,
  setProjectHistory,
  getProjectHistory,
  invalidate,
  CACHE_CONFIG,
} = require('../../miniapp/utils/cache');

describe('utils/cache.js', () => {
  beforeEach(() => {
    // 清空模拟存储
    Object.keys(global.mockStorage).forEach(key => delete global.mockStorage[key]);
  });

  describe('基础方法', () => {
    describe('set', () => {
      test('应该正确设置缓存', () => {
        const data = { name: 'test' };
        set('test_key', data, 60000);

        expect(global.mockWx.setStorageSync).toHaveBeenCalledWith(
          'test_key',
          expect.objectContaining({
            data,
            version: '1.0.0',
          })
        );
      });

      test('应该设置正确的过期时�?, () => {
        const now = Date.now();
        const ttl = 60000;
        set('test_key', 'data', ttl);

        const storedItem = global.mockStorage['test_key'];
        expect(storedItem.expireAt).toBeGreaterThanOrEqual(now + ttl);
      });
    });

    describe('get', () => {
      test('应该正确获取有效缓存', () => {
        const data = { name: 'test' };
        global.mockStorage['test_key'] = {
          data,
          expireAt: Date.now() + 60000,
          version: '1.0.0',
        };

        const result = get('test_key');

        expect(result).toEqual(data);
      });

      test('过期缓存应返�?null 并删�?, () => {
        global.mockStorage['test_key'] = {
          data: 'expired',
          expireAt: Date.now() - 1000, // 已过�?          version: '1.0.0',
        };

        const result = get('test_key');

        expect(result).toBeNull();
        expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith('test_key');
      });

      test('版本不匹配应返回 null 并删�?, () => {
        global.mockStorage['test_key'] = {
          data: 'old_version',
          expireAt: Date.now() + 60000,
          version: '0.9.0', // 旧版�?        };

        const result = get('test_key');

        expect(result).toBeNull();
        expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith('test_key');
      });

      test('不存在的缓存应返�?null', () => {
        const result = get('nonexistent_key');
        expect(result).toBeNull();
      });
    });

    describe('remove', () => {
      test('应该正确删除缓存', () => {
        remove('test_key');
        expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith('test_key');
      });
    });

    describe('clearAll', () => {
      test('应该清除所有配置的缓存', () => {
        clearAll();

        const expectedKeys = Object.values(CACHE_CONFIG).map(c => c.key);
        expectedKeys.forEach(key => {
          expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith(key);
        });
      });
    });

    describe('clearExpired', () => {
      test('应该清除过期缓存', () => {
        // 设置一个过期的缓存
        global.mockStorage[CACHE_CONFIG.USER_INFO.key] = {
          data: 'user',
          expireAt: Date.now() - 1000,
          version: '1.0.0',
        };

        // 设置一个有效的缓存
        global.mockStorage[CACHE_CONFIG.REVIEW_STATS.key] = {
          data: 'stats',
          expireAt: Date.now() + 60000,
          version: '1.0.0',
        };

        clearExpired();

        expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith(CACHE_CONFIG.USER_INFO.key);
        expect(global.mockWx.removeStorageSync).not.toHaveBeenCalledWith(CACHE_CONFIG.REVIEW_STATS.key);
      });
    });
  });

  describe('业务方法', () => {
    describe('用户信息缓存', () => {
      test('setUserInfo �?getUserInfo 应该正确工作', () => {
        const userInfo = { openid: 'test_openid', userName: '测试用户' };
        setUserInfo(userInfo);

        // 验证设置
        expect(global.mockWx.setStorageSync).toHaveBeenCalledWith(
          CACHE_CONFIG.USER_INFO.key,
          expect.objectContaining({ data: userInfo })
        );

        // 设置存储以便获取
        global.mockStorage[CACHE_CONFIG.USER_INFO.key] = {
          data: userInfo,
          expireAt: Date.now() + CACHE_CONFIG.USER_INFO.ttl,
          version: '1.0.0',
        };

        const result = getUserInfo();
        expect(result).toEqual(userInfo);
      });
    });

    describe('审核统计缓存', () => {
      test('setReviewStats �?getReviewStats 应该正确工作', () => {
        const stats = { pending: 5, approved: 10, rejected: 2 };
        setReviewStats(stats);

        expect(global.mockWx.setStorageSync).toHaveBeenCalledWith(
          CACHE_CONFIG.REVIEW_STATS.key,
          expect.objectContaining({ data: stats })
        );

        global.mockStorage[CACHE_CONFIG.REVIEW_STATS.key] = {
          data: stats,
          expireAt: Date.now() + CACHE_CONFIG.REVIEW_STATS.ttl,
          version: '1.0.0',
        };

        const result = getReviewStats();
        expect(result).toEqual(stats);
      });
    });

    describe('审核列表缓存', () => {
      test('setReviewList �?getReviewList 应该正确工作', () => {
        const status = 'pending';
        const data = { list: [{ id: 1 }], total: 1, page: 1 };

        setReviewList(status, data);

        const expectedKey = `${CACHE_CONFIG.REVIEW_LIST.key}_${status}`;
        expect(global.mockWx.setStorageSync).toHaveBeenCalledWith(
          expectedKey,
          expect.objectContaining({ data })
        );

        global.mockStorage[expectedKey] = {
          data,
          expireAt: Date.now() + CACHE_CONFIG.REVIEW_LIST.ttl,
          version: '1.0.0',
        };

        const result = getReviewList(status);
        expect(result).toEqual(data);
      });
    });

    describe('项目历史缓存', () => {
      test('setProjectHistory �?getProjectHistory 应该正确工作', () => {
        const fillerName = '张三';
        const data = { list: [{ id: 1 }], total: 1 };

        setProjectHistory(fillerName, data);

        const expectedKey = `${CACHE_CONFIG.PROJECT_HISTORY.key}_${fillerName}`;
        expect(global.mockWx.setStorageSync).toHaveBeenCalledWith(
          expectedKey,
          expect.objectContaining({ data })
        );

        global.mockStorage[expectedKey] = {
          data,
          expireAt: Date.now() + CACHE_CONFIG.PROJECT_HISTORY.ttl,
          version: '1.0.0',
        };

        const result = getProjectHistory(fillerName);
        expect(result).toEqual(data);
      });
    });

    describe('invalidate', () => {
      test("invalidate('user') 应该清除用户缓存", () => {
        invalidate('user');
        expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith(CACHE_CONFIG.USER_INFO.key);
      });

      test("invalidate('stats') 应该清除统计缓存", () => {
        invalidate('stats');
        expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith(CACHE_CONFIG.REVIEW_STATS.key);
      });

      test("invalidate('review') 应该清除所有审核列表缓�?, () => {
        invalidate('review');

        ['pending', 'approved', 'rejected'].forEach(status => {
          expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith(
            `${CACHE_CONFIG.REVIEW_LIST.key}_${status}`
          );
        });
      });

      test('invalidate 无效类型应该清除所有缓�?, () => {
        invalidate('unknown');
        const expectedKeys = Object.values(CACHE_CONFIG).map(c => c.key);
        expectedKeys.forEach(key => {
          expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith(key);
        });
      });
    });
  });

  describe('CACHE_CONFIG', () => {
    test('应该包含所有必要的缓存配置', () => {
      expect(CACHE_CONFIG).toHaveProperty('USER_INFO');
      expect(CACHE_CONFIG).toHaveProperty('REVIEW_STATS');
      expect(CACHE_CONFIG).toHaveProperty('REVIEW_LIST');
      expect(CACHE_CONFIG).toHaveProperty('PROJECT_HISTORY');
      expect(CACHE_CONFIG).toHaveProperty('PROJECT_LIST');
    });

    test('每个配置应该包含 key �?ttl', () => {
      Object.values(CACHE_CONFIG).forEach(config => {
        expect(config).toHaveProperty('key');
        expect(config).toHaveProperty('ttl');
        expect(typeof config.key).toBe('string');
        expect(typeof config.ttl).toBe('number');
      });
    });
  });
});
