'use strict';

const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

/**
 * 参数校验中间件工厂
 * 使用 Joi Schema 对请求数据进行校验
 *
 * @param {Object} schema - Joi 校验规则对象
 * @param {string} [source='body'] - 校验来源：'body' | 'query' | 'params'
 * @returns {Function} Express 中间件
 *
 * @example
 * // 校验请求体
 * router.post('/user/create',
 *   validate(createUserSchema),
 *   userController.create
 * );
 *
 * @example
 * // 校验查询参数
 * router.get('/user/list',
 *   validate(listQuerySchema, 'query'),
 *   userController.list
 * );
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[source];

    if (!dataToValidate) {
      throw new ValidationError(`请求 ${source} 为空`);
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      // 友好化错误信息：字段名 + 错误原因
      const errorMessages = error.details.map((detail) => {
        const field = detail.path.join('.');
        const message = detail.message.replace(/"/g, '');
        return `${field}: ${message}`;
      });

      throw new ValidationError(`参数校验失败: ${errorMessages.join('; ')}`);
    }

    // 用校验后的值替换原始数据
    req[source] = value;
    next();
  };
}

module.exports = { validate };
