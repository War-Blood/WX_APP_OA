'use strict';

const {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  BusinessError,
} = require('../../../src/common/utils/errors');

const { ErrorCode } = require('../../../src/common/utils/constants');

describe('自定义错误类 - errors.js', () => {
  describe('AppError 基类', () => {
    it('应正确设置 httpStatus、code、message 和 data', () => {
      const err = new AppError(400, 1001, '参数错误', { field: 'name' });
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err.httpStatus).toBe(400);
      expect(err.code).toBe(1001);
      expect(err.message).toBe('参数错误');
      expect(err.data).toEqual({ field: 'name' });
      expect(err.name).toBe('AppError');
    });

    it('data 应默认为 null', () => {
      const err = new AppError(500, 5000, '服务器错误');
      expect(err.data).toBeNull();
    });

    it('应有 stack 追踪信息', () => {
      const err = new AppError(400, 1001, '错误');
      expect(err.stack).toBeDefined();
      expect(err.stack).toContain('AppError');
    });
  });

  describe('ValidationError（参数校验错误）', () => {
    it('应使用默认值正确实例化', () => {
      const err = new ValidationError();
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.httpStatus).toBe(400);
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(err.message).toBe('请求参数校验失败');
      expect(err.data).toBeNull();
      expect(err.name).toBe('ValidationError');
    });

    it('应支持自定义消息和附加数据', () => {
      const err = new ValidationError('邮箱格式错误', { field: 'email' });
      expect(err.message).toBe('邮箱格式错误');
      expect(err.data).toEqual({ field: 'email' });
    });
  });

  describe('AuthError（认证错误）', () => {
    it('应使用默认值正确实例化', () => {
      const err = new AuthError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(AuthError);
      expect(err.httpStatus).toBe(401);
      expect(err.code).toBe(ErrorCode.AUTH_ERROR);
      expect(err.message).toBe('未授权访问');
      expect(err.name).toBe('AuthError');
    });

    it('应支持自定义消息', () => {
      const err = new AuthError('Token 已过期，请重新登录');
      expect(err.message).toBe('Token 已过期，请重新登录');
    });
  });

  describe('ForbiddenError（权限错误）', () => {
    it('应使用默认值正确实例化', () => {
      const err = new ForbiddenError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(ForbiddenError);
      expect(err.httpStatus).toBe(403);
      expect(err.code).toBe(ErrorCode.FORBIDDEN);
      expect(err.message).toBe('无权限访问');
      expect(err.name).toBe('ForbiddenError');
    });

    it('应支持自定义消息', () => {
      const err = new ForbiddenError('仅管理员可操作');
      expect(err.message).toBe('仅管理员可操作');
    });
  });

  describe('NotFoundError（资源不存在）', () => {
    it('应使用默认值正确实例化', () => {
      const err = new NotFoundError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err.httpStatus).toBe(404);
      expect(err.code).toBe(ErrorCode.NOT_FOUND);
      expect(err.message).toBe('资源不存在');
      expect(err.name).toBe('NotFoundError');
    });

    it('应支持自定义消息', () => {
      const err = new NotFoundError('用户不存在');
      expect(err.message).toBe('用户不存在');
    });
  });

  describe('BusinessError（业务逻辑错误）', () => {
    it('应使用默认值正确实例化', () => {
      const err = new BusinessError();
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(BusinessError);
      expect(err.httpStatus).toBe(200);
      expect(err.code).toBe(ErrorCode.BUSINESS_ERROR);
      expect(err.message).toBe('业务逻辑错误');
      expect(err.name).toBe('BusinessError');
    });

    it('应支持自定义消息', () => {
      const err = new BusinessError('库存不足');
      expect(err.message).toBe('库存不足');
    });
  });

  describe('继承链验证', () => {
    it('所有错误类都应正确继承自 AppError 和 Error', () => {
      const errors = [
        new ValidationError(),
        new AuthError(),
        new ForbiddenError(),
        new NotFoundError(),
        new BusinessError(),
      ];
      errors.forEach((err) => {
        expect(err instanceof Error).toBe(true);
        expect(err instanceof AppError).toBe(true);
        expect(err.name).toBe(err.constructor.name);
      });
    });
  });
});
