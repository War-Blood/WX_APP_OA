'use strict';

const { BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 消息模板渲染
 * 变量语法 {{var}}：
 *   内置变量: date / date_N（N 天前）/ weekday / time / script_name / mention_names
 *   数据源字段: {{<source>.<field>}}，如 {{daily_report.missing_count}}
 */

const MAX_LENGTH = { text: 2048, markdown: 4096 }; // 企微限制：text 2048B / markdown 4096B

/**
 * 渲染模板
 * @param {string} template - 模板原文
 * @param {Object} context - 数据源上下文 {source: {field: value}}
 * @param {Object} meta - 渲染元信息 {date, time, scriptName, mentionNames}
 * @returns {{content: string, unknownVars: string[]}}
 */
function render(template, context, meta) {
  if (!template || typeof template !== 'string') {
    throw new BusinessError('消息模板不能为空', null, ErrorCode.PUSH_INVALID_TEMPLATE);
  }
  const m = meta || {};
  const ctx = context || {};
  const unknownVars = [];

  // 预计算内置变量映射
  const builtin = {
    date: m.date || '',
    weekday: m.weekday != null ? m.weekday : '',
    time: m.time || '',
    script_name: m.scriptName || '',
    mention_names: m.mentionNames || '',
  };
  for (let n = 1; n <= 30; n++) {
    builtin[`date_${n}`] = m.datesAgo && m.datesAgo[n] ? m.datesAgo[n] : '';
  }

  const content = template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (raw, key) => {
    if (Object.prototype.hasOwnProperty.call(builtin, key)) {
      return String(builtin[key]);
    }
    const dot = key.indexOf('.');
    if (dot > 0) {
      const source = key.slice(0, dot);
      const field = key.slice(dot + 1);
      const src = ctx[source];
      if (src && src[field] !== undefined && src[field] !== null) {
        return String(src[field]);
      }
    }
    unknownVars.push(key);
    return raw;
  });

  return { content, unknownVars };
}

/**
 * 长度校验与截断（按 msgtype 上限，按字节）
 * @param {string} msgtype - 'text' | 'markdown'
 * @param {string} content - 渲染后内容
 * @returns {{ok: boolean, truncated: boolean, content: string}}
 */
function enforceLimit(msgtype, content) {
  const limit = MAX_LENGTH[msgtype] || MAX_LENGTH.text;
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes <= limit) return { ok: true, truncated: false, content };
  // 按字节截断（避免切断多字节字符：逐字符累计）
  let acc = '';
  for (const ch of content) {
    if (Buffer.byteLength(acc + ch, 'utf8') > limit) break;
    acc += ch;
  }
  return { ok: false, truncated: true, content: acc };
}

/**
 * dryRun 用：校验模板中是否存在未知变量
 * @param {string} template - 模板原文
 * @param {Object} context - 数据源上下文
 * @param {Object} meta - 渲染元信息
 * @returns {Array<string>} 未知变量列表
 */
function findUnknownVars(template, context, meta) {
  return render(template, context, meta).unknownVars;
}

module.exports = { render, enforceLimit, findUnknownVars, MAX_LENGTH };
