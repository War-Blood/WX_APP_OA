'use strict';

const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 条件判定引擎
 * 规则结构: { logic: 'AND'|'OR', rules: [{ source, field, operator, value }] }
 * 白名单数据源字段由 data-source.service 注册，未知字段返回 false 并记录原因。
 */

/**
 * 操作符实现表
 * @type {Object<string, function(actual: any, expected: any): boolean>}
 */
const OPERATORS = {
  '==': (a, e) => String(a) === String(e),
  '!=': (a, e) => String(a) !== String(e),
  '>': (a, e) => Number(a) > Number(e),
  '>=': (a, e) => Number(a) >= Number(e),
  '<': (a, e) => Number(a) < Number(e),
  '<=': (a, e) => Number(a) <= Number(e),
  in: (a, e) => Array.isArray(e) && e.map(String).includes(String(a)),
  not_in: (a, e) => Array.isArray(e) && !e.map(String).includes(String(a)),
  contains: (a, e) => String(a).includes(String(e)),
  is_true: (a) => a === true || a === 1 || a === '1' || a === 'true',
  is_false: (a) => !(a === true || a === 1 || a === '1' || a === 'true'),
  is_empty: (a) => a === null || a === undefined || a === '' || (Array.isArray(a) && a.length === 0),
  not_empty: (a) => !(a === null || a === undefined || a === '' || (Array.isArray(a) && a.length === 0)),
};

/**
 * 校验条件配置结构
 * @param {Object} config - conditionConfig
 * @throws {ValidationError} 配置非法时
 */
function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new ValidationError('发送条件不能为空');
  }
  if (!['AND', 'OR'].includes(config.logic)) {
    throw new ValidationError('条件逻辑必须为 AND 或 OR');
  }
  if (!Array.isArray(config.rules) || config.rules.length === 0) {
    throw new ValidationError('发送条件至少需要一条规则');
  }
  config.rules.forEach((rule, i) => {
    if (!rule || typeof rule !== 'object') {
      throw new ValidationError(`第 ${i + 1} 条条件格式非法`);
    }
    if (!rule.source || !rule.field) {
      throw new ValidationError(`第 ${i + 1} 条条件缺少数据源或字段`);
    }
    if (!OPERATORS[rule.operator]) {
      throw new ValidationError(`第 ${i + 1} 条条件操作符不受支持: ${rule.operator}`);
    }
  });
}

/**
 * 单条规则判定
 * @param {Object} rule - {source, field, operator, value}
 * @param {Object} context - 数据源上下文
 * @returns {{result: boolean, actual: *, reason: string|null}}
 */
function evalRule(rule, context) {
  const sourceCtx = context[rule.source];
  if (sourceCtx === null || sourceCtx === undefined) {
    return { result: false, actual: null, reason: `数据源 ${rule.source} 不可用（加载失败或不存在）` };
  }
  const actual = sourceCtx[rule.field];
  if (actual === undefined) {
    return { result: false, actual: null, reason: `字段 ${rule.source}.${rule.field} 不存在` };
  }
  try {
    const fn = OPERATORS[rule.operator];
    return { result: !!fn(actual, rule.value), actual, reason: null };
  } catch (err) {
    return { result: false, actual, reason: `判定异常: ${err.message}` };
  }
}

/**
 * 执行条件判定
 * @param {Object} config - {logic, rules}
 * @param {Object} context - 数据源上下文
 * @returns {{passed: boolean, details: Array}}
 */
function evaluate(config, context) {
  if (!config || !Array.isArray(config.rules) || config.rules.length === 0) {
    return { passed: false, details: [] };
  }
  const logic = config.logic === 'OR' ? 'OR' : 'AND';
  const details = config.rules.map((rule) => {
    const r = evalRule(rule, context);
    return {
      source: rule.source,
      field: rule.field,
      operator: rule.operator,
      expected: rule.value ?? null,
      actual: r.actual,
      result: r.result,
      reason: r.reason,
    };
  });
  const passed = logic === 'AND'
    ? details.every((d) => d.result)
    : details.some((d) => d.result);
  return { passed, details };
}

/**
 * 校验配置并抛错（供 script.service 保存时使用）
 * @param {Object} config - conditionConfig
 */
function assertValid(config) {
  validateConfig(config);
  // 字段存在性需在保存时与数据源元信息比对
  const meta = require('./data-source.service').getSourceMeta();
  const fieldMap = {};
  meta.forEach((s) => { fieldMap[s.id] = new Set(s.fields.map((f) => f.id)); });
  config.rules.forEach((rule) => {
    if (!fieldMap[rule.source] || !fieldMap[rule.source].has(rule.field)) {
      throw new BusinessError(`条件字段不存在: ${rule.source}.${rule.field}`, null, ErrorCode.PUSH_CONDITION_ERROR);
    }
  });
}

module.exports = { evaluate, assertValid };
