'use strict';

const { success, fail, paginated } = require('../../../src/common/utils/response');

describe('响应工具 - response.js', () => {
  describe('success()', () => {
    it('应返回默认成功响应（无参数）', () => {
      const result = success();
      expect(result).toEqual({
        code: 0,
        message: 'success',
        data: null,
      });
    });

    it('应返回带数据的成功响应', () => {
      const data = { id: 1, name: '测试' };
      const result = success(data);
      expect(result.code).toBe(0);
      expect(result.message).toBe('success');
      expect(result.data).toEqual(data);
    });

    it('应返回带自定义消息的成功响应', () => {
      const result = success(null, '操作成功');
      expect(result.code).toBe(0);
      expect(result.message).toBe('操作成功');
      expect(result.data).toBeNull();
    });

    it('应返回带数据和自定义消息的成功响应', () => {
      const data = { id: 1 };
      const result = success(data, '创建成功');
      expect(result.code).toBe(0);
      expect(result.message).toBe('创建成功');
      expect(result.data).toEqual(data);
    });

    it('应正确处理数组数据', () => {
      const data = [1, 2, 3];
      const result = success(data);
      expect(result.data).toEqual([1, 2, 3]);
    });

    it('应正确处理字符串数据', () => {
      const result = success('hello');
      expect(result.data).toBe('hello');
    });
  });

  describe('fail()', () => {
    it('应返回带有错误码和消息的错误响应', () => {
      const result = fail(1001, '参数校验失败');
      expect(result).toEqual({
        code: 1001,
        message: '参数校验失败',
        data: null,
      });
    });

    it('应返回带附加数据的错误响应', () => {
      const errors = [{ field: 'name', message: '姓名不能为空' }];
      const result = fail(1001, '参数校验失败', errors);
      expect(result.code).toBe(1001);
      expect(result.message).toBe('参数校验失败');
      expect(result.data).toEqual(errors);
    });

    it('应正确处理 401 认证错误', () => {
      const result = fail(401, '未授权访问');
      expect(result.code).toBe(401);
      expect(result.message).toBe('未授权访问');
    });

    it('应正确处理 403 权限错误', () => {
      const result = fail(403, '无权限访问');
      expect(result.code).toBe(403);
    });
  });

  describe('paginated()', () => {
    it('应返回标准分页响应格式', () => {
      const list = [{ id: 1 }, { id: 2 }];
      const result = paginated(list, 20, 1, 10);
      expect(result.code).toBe(0);
      expect(result.message).toBe('success');
      expect(result.data.list).toEqual(list);
      expect(result.data.total).toBe(20);
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(10);
      expect(result.data.totalPages).toBe(2);
    });

    it('应正确处理空列表', () => {
      const result = paginated([], 0, 1, 10);
      expect(result.data.list).toEqual([]);
      expect(result.data.total).toBe(0);
      expect(result.data.totalPages).toBe(0);
    });

    it('应正确处理最后一页', () => {
      const list = [{ id: 1 }];
      const result = paginated(list, 21, 3, 10);
      expect(result.data.totalPages).toBe(3);
      expect(result.data.page).toBe(3);
    });

    it('应正确处理 singlePage 情况', () => {
      const list = [{ id: 1 }];
      const result = paginated(list, 1, 1, 10);
      expect(result.data.totalPages).toBe(1);
    });

    it('应正确处理大数量分页', () => {
      const list = Array(50).fill({ id: 1 });
      const result = paginated(list, 500, 1, 50);
      expect(result.data.total).toBe(500);
      expect(result.data.totalPages).toBe(10);
      expect(result.data.pageSize).toBe(50);
    });

    it('totalPages 应在 total=0 时返回 0', () => {
      const result = paginated([], 0, 1, 10);
      expect(result.data.totalPages).toBe(0);
    });
  });
});
