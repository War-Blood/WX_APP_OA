'use strict';

const mockValidate = jest.fn();

jest.mock('joi', () => ({
  __esModule: true,
  object: jest.fn(() => ({
    validate: mockValidate,
  })),
}));

jest.mock('../../../src/common/config/env', () => ({
  logLevel: 'silent',
  nodeEnv: 'test',
}));

const { validate } = require('../../../src/common/middleware/validator');

describe('参数校验中间件 - validator.js', () => {
  let req;
  let res;
  let next;
  let schema;

  function callMiddleware(source) {
    const middleware = validate(schema, source || 'body');
    try {
      middleware(req, res, next);
    } catch (err) {
      // 中间件内部 throw 错误，此处捕获并传递给 next
      next(err);
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, query: {}, params: {} };
    res = {};
    next = jest.fn();
    schema = { validate: mockValidate };
  });

  describe('校验通过', () => {
    it('默认 source=body 校验通过时应调用 next() 并替换 req.body', () => {
      const validatedData = { name: '张三', age: 25 };
      mockValidate.mockReturnValue({ error: undefined, value: validatedData });

      req.body = { name: '张三', age: 25, extraField: 'ignored' };
      callMiddleware();

      expect(mockValidate).toHaveBeenCalledWith(
        { name: '张三', age: 25, extraField: 'ignored' },
        expect.objectContaining({ abortEarly: false, allowUnknown: false, stripUnknown: true })
      );
      expect(req.body).toEqual(validatedData);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('source=query 校验通过时应替换 req.query', () => {
      const validatedData = { page: '1', size: '10' };
      mockValidate.mockReturnValue({ error: undefined, value: validatedData });

      req.query = { page: '1', size: '10', extra: 'x' };
      callMiddleware('query');

      expect(req.query).toEqual(validatedData);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('source=params 校验通过时应替换 req.params', () => {
      const validatedData = { id: '123' };
      mockValidate.mockReturnValue({ error: undefined, value: validatedData });

      req.params = { id: '123' };
      callMiddleware('params');

      expect(req.params).toEqual(validatedData);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('校验失败', () => {
    it('校验失败时应抛出 ValidationError（code=1001）', () => {
      mockValidate.mockReturnValue({
        error: { details: [{ path: ['name'], message: '"name" 是必填字段' }] },
        value: undefined,
      });

      req.body = { age: 25 };
      callMiddleware();

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.httpStatus).toBe(400);
      expect(err.code).toBe(1001);
      expect(err.message).toContain('参数校验失败');
      expect(err.message).toContain('name');
      expect(err.message).toContain('必填字段');
    });

    it('多条错误应合并显示', () => {
      mockValidate.mockReturnValue({
        error: {
          details: [
            { path: ['name'], message: '"name" 是必填字段' },
            { path: ['age'], message: '"age" 必须是数字' },
          ],
        },
        value: undefined,
      });

      req.body = {};
      callMiddleware();

      const err = next.mock.calls[0][0];
      expect(err.message).toContain('name');
      expect(err.message).toContain('age');
      expect(err.message).toContain(';');
    });

    it('校验失败时不应修改原始数据', () => {
      mockValidate.mockReturnValue({
        error: { details: [{ path: ['name'], message: '"name" 是必填字段' }] },
        value: undefined,
      });

      req.body = { name: '' };
      callMiddleware();

      expect(req.body).toEqual({ name: '' });
    });
  });

  describe('source 参数异常', () => {
    it('请求 source 数据不存在时应抛出 ValidationError', () => {
      req.body = undefined;
      callMiddleware();

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err.httpStatus).toBe(400);
      expect(err.code).toBe(1001);
      expect(err.message).toContain('请求 body 为空');
    });

    it('source=query 数据不存在时应报 query 为空', () => {
      req.query = undefined;
      callMiddleware('query');

      const err = next.mock.calls[0][0];
      expect(err.message).toContain('请求 query 为空');
    });
  });
});
