// tests/utils/debounce.test.js - 防抖函数测试

const { debounce, formatDate, formatDateTime } = require('../../miniapp/utils/debounce');

describe('utils/debounce.js', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('debounce', () => {
    test('应该延迟执行函数', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('应该只执行最后一次调�?, () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    test('多次调用后应该重置定时器', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      jest.advanceTimersByTime(50);

      debouncedFn();
      jest.advanceTimersByTime(50);

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('应该保持 this 上下�?, () => {
      const obj = {
        value: 42,
        method: jest.fn(function() { return this.value; }),
      };

      obj.debouncedMethod = debounce(obj.method, 100);
      obj.debouncedMethod();

      jest.advanceTimersByTime(100);

      expect(obj.method).toHaveBeenCalledTimes(1);
    });
  });

  describe('formatDate', () => {
    test('应该格式化日期为 YYYY-MM-DD', () => {
      const date = new Date(2024, 5, 15); // 2024-06-15
      const result = formatDate(date);
      expect(result).toBe('2024-06-15');
    });

    test('不传参数应返回今天的日期', () => {
      const result = formatDate();
      const today = new Date();
      const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      expect(result).toBe(expected);
    });

    test('应该处理个位数的月份和日�?, () => {
      const date = new Date(2024, 0, 5); // 2024-01-05
      const result = formatDate(date);
      expect(result).toBe('2024-01-05');
    });
  });

  describe('formatDateTime', () => {
    test('应该格式化日期时间为 YYYY-MM-DD HH:mm', () => {
      const result = formatDateTime('2024-06-15T14:30:00');
      expect(result).toBe('2024-06-15 14:30');
    });

    test('空值应返回空字符串', () => {
      expect(formatDateTime(null)).toBe('');
      expect(formatDateTime(undefined)).toBe('');
      expect(formatDateTime('')).toBe('');
    });

    test('应该处理 Date 对象', () => {
      const date = new Date(2024, 5, 15, 14, 30, 0);
      const result = formatDateTime(date);
      expect(result).toBe('2024-06-15 14:30');
    });

    test('应该处理个位�?, () => {
      const date = new Date(2024, 0, 5, 9, 5, 0);
      const result = formatDateTime(date);
      expect(result).toBe('2024-01-05 09:05');
    });
  });
});
