// tests/utils/request.test.js - 请求工具函数测试

// 模拟配置
jest.mock('../../config/index', () => ({
  BASE_URL: 'https://api.example.com',
  TIMEOUT: 10000,
  storageKeys: {
    accessToken: 'access_token',
    userInfo: 'user_info',
  },
}));

const {
  DefaultErrorHandler,
  SilentErrorHandler,
  RetryErrorHandler,
  MemoryCacheStrategy,
  StorageCacheStrategy,
  NoCacheStrategy,
  BearerAuthStrategy,
  NoAuthStrategy,
  CustomAuthStrategy,
  RequestContext,
  createRequestContext,
} = require('../../miniapp/utils/request');

describe('utils/request.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(global.mockStorage).forEach(key => delete global.mockStorage[key]);
  });

  describe('DefaultErrorHandler', () => {
    test('应该显示错误提示', () => {
      const handler = new DefaultErrorHandler();
      const error = { message: '测试错误' };
      const result = handler.handle(error, { showError: true });

      expect(result).toEqual(error);
      expect(global.mockWx.showToast).toHaveBeenCalledWith({
        title: '测试错误',
        icon: 'none',
      });
    });

    test('showError �?false 时不显示提示', () => {
      const handler = new DefaultErrorHandler();
      const error = { message: '测试错误' };
      const result = handler.handle(error, { showError: false });

      expect(result).toEqual(error);
      expect(global.mockWx.showToast).not.toHaveBeenCalled();
    });
  });

  describe('SilentErrorHandler', () => {
    test('应该静默返回错误', () => {
      const handler = new SilentErrorHandler();
      const error = { message: '测试错误' };
      const result = handler.handle(error, {});

      expect(result).toEqual(error);
      expect(global.mockWx.showToast).not.toHaveBeenCalled();
    });
  });

  describe('RetryErrorHandler', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('应该返回重试信息', async () => {
      const handler = new RetryErrorHandler(3, 100);
      const error = { code: -1, message: '网络错误' };

      const resultPromise = handler.handle(error, { showError: false });
      await jest.runAllTimersAsync();

      const result = await resultPromise;
      expect(result.shouldRetry).toBe(true);
      expect(result.retryCount).toBe(1);
    });

    test('超过最大重试次数应返回错误', async () => {
      const handler = new RetryErrorHandler(1, 100);
      const error = { code: -1, message: '网络错误' };

      // 第一次重�?      const resultPromise1 = handler.handle(error, { showError: false });
      await jest.runAllTimersAsync();
      await resultPromise1;

      // 第二次调用（超过最大次数）
      const resultPromise2 = handler.handle(error, { showError: false });
      await jest.runAllTimersAsync();
      const result = await resultPromise2;

      expect(result.shouldRetry).toBe(false);
    });

    test('不可重试的错误应直接返回', async () => {
      const handler = new RetryErrorHandler(3, 100);
      const error = { code: 400, message: '参数错误' };

      const result = await handler.handle(error, { showError: false });

      expect(result.shouldRetry).toBe(false);
      expect(result.error).toEqual(error);
    });
  });

  describe('MemoryCacheStrategy', () => {
    test('应该正确设置和获取缓�?, () => {
      const cache = new MemoryCacheStrategy();
      cache.set('test_key', { data: 'test' }, 60000);

      const result = cache.get('test_key');
      expect(result).toEqual({ data: 'test' });
    });

    test('过期缓存应返�?null', () => {
      jest.useFakeTimers();
      const cache = new MemoryCacheStrategy();
      cache.set('test_key', { data: 'test' }, 1000);

      jest.advanceTimersByTime(2000);
      const result = cache.get('test_key');

      expect(result).toBeNull();
      jest.useRealTimers();
    });

    test('不存在的缓存应返�?null', () => {
      const cache = new MemoryCacheStrategy();
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    test('clear 应该清除所有缓�?, () => {
      const cache = new MemoryCacheStrategy();
      cache.set('key1', 'value1', 60000);
      cache.set('key2', 'value2', 60000);

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('StorageCacheStrategy', () => {
    test('应该正确设置和获取缓�?, () => {
      const cache = new StorageCacheStrategy();
      cache.set('test_key', { data: 'test' }, 60000);

      const result = cache.get('test_key');
      expect(result).toEqual({ data: 'test' });
    });

    test('不存在的缓存应返�?null', () => {
      const cache = new StorageCacheStrategy();
      const result = cache.get('nonexistent');
      expect(result).toBeNull();
    });

    test('clear 应该清除所有缓�?, () => {
      const cache = new StorageCacheStrategy();
      cache.set('cache_key1', 'value1', 60000);

      global.mockStorage['other_key'] = 'should_remain';

      cache.clear();

      expect(global.mockWx.removeStorageSync).toHaveBeenCalledWith('cache_key1');
    });
  });

  describe('NoCacheStrategy', () => {
    test('get 应该返回 null', () => {
      const cache = new NoCacheStrategy();
      expect(cache.get('any_key')).toBeNull();
    });

    test('set 不应该做任何�?, () => {
      const cache = new NoCacheStrategy();
      cache.set('key', 'value', 1000);
      // 不应该抛出错�?    });
  });

  describe('BearerAuthStrategy', () => {
    test('�?token 时应该返�?Authorization header', () => {
      global.mockStorage['access_token'] = 'test_token_123';

      const auth = new BearerAuthStrategy();
      const headers = auth.getHeaders();

      expect(headers).toEqual({ Authorization: 'Bearer test_token_123' });
    });

    test('�?token 时应该返回空对象', () => {
      const auth = new BearerAuthStrategy();
      const headers = auth.getHeaders();

      expect(headers).toEqual({});
    });
  });

  describe('NoAuthStrategy', () => {
    test('应该返回空对�?, () => {
      const auth = new NoAuthStrategy();
      const headers = auth.getHeaders();

      expect(headers).toEqual({});
    });
  });

  describe('CustomAuthStrategy', () => {
    test('应该使用自定�?header 生成�?, () => {
      const auth = new CustomAuthStrategy(() => ({ 'X-Custom': 'custom_value' }));
      const headers = auth.getHeaders();

      expect(headers).toEqual({ 'X-Custom': 'custom_value' });
    });
  });

  describe('RequestContext', () => {
    test('应该正确创建默认上下�?, () => {
      const context = new RequestContext();

      expect(context.authStrategy).toBeInstanceOf(BearerAuthStrategy);
      expect(context.cacheStrategy).toBeInstanceOf(NoCacheStrategy);
      expect(context.errorHandler).toBeInstanceOf(DefaultErrorHandler);
    });

    test('应该支持链式调用设置策略', () => {
      const context = new RequestContext();

      const result = context
        .setAuthStrategy(new NoAuthStrategy())
        .setCacheStrategy(new MemoryCacheStrategy())
        .setErrorHandler(new SilentErrorHandler());

      expect(result).toBe(context);
      expect(context.authStrategy).toBeInstanceOf(NoAuthStrategy);
      expect(context.cacheStrategy).toBeInstanceOf(MemoryCacheStrategy);
      expect(context.errorHandler).toBeInstanceOf(SilentErrorHandler);
    });

    test('enableRetry 应该创建 RetryErrorHandler', () => {
      const context = new RequestContext();
      context.enableRetry(5, 2000);

      expect(context.retryHandler).toBeInstanceOf(RetryErrorHandler);
    });
  });

  describe('createRequestContext', () => {
    test('应该创建新的 RequestContext 实例', () => {
      const context = createRequestContext();
      expect(context).toBeInstanceOf(RequestContext);
    });
  });
});
