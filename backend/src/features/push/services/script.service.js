'use strict';

const cron = require('node-cron');
const db = require('../../../common/config/database');
const webhookService = require('./webhook.service');
const conditionService = require('./condition.service');
const { ValidationError, NotFoundError, BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 推送脚本管理
 * 变更后触发 push.task.syncScripts() 全量重同步调度。
 */

const DAILY_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TZ_RE = /^[A-Za-z_\/+-]{2,}$/;

/**
 * 分页查询
 * @param {Object} params - {page, pageSize, keyword, status}
 * @returns {Promise<{list: Array, total: number}>}
 */
async function list({ page = 1, pageSize = 20, keyword, status } = {}) {
  const conditions = [];
  const params = [];
  if (keyword) {
    conditions.push('(s.name LIKE ? OR s.description LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status && ['enabled', 'disabled'].includes(status)) {
    conditions.push('s.status = ?');
    params.push(status);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await db.query(
    `SELECT COUNT(*) AS total FROM push_scripts s ${where}`,
    params
  );
  const total = Number(countRows[0]?.total) || 0;

  const offset = (Number(page) - 1) * Number(pageSize);
  const rows = await db.query(
    `SELECT s.*, w.name AS webhook_name, w.enabled AS webhook_enabled, w.env_name
     FROM push_scripts s
     LEFT JOIN push_webhooks w ON w.id = s.webhook_id
     ${where}
     ORDER BY s.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(pageSize), offset]
  );

  const listData = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description || '',
    status: r.status,
    scheduleType: r.schedule_type,
    scheduleValue: r.schedule_value,
    timezone: r.timezone,
    webhookId: r.webhook_id,
    webhookName: r.webhook_name || '',
    webhookEnabled: !!r.webhook_enabled,
    msgtype: r.msgtype,
    mentionType: r.mention_type,
    mentionSource: r.mention_source || '',
    retryTimes: r.retry_times,
    retryInterval: r.retry_interval,
    maxDailySends: r.max_daily_sends,
    consecutiveFailures: r.consecutive_failures,
    notifyOnFail: !!r.notify_on_fail,
    lastRunAt: r.last_run_at,
    lastRunStatus: r.last_run_status,
    lastError: r.last_error || '',
    createdAt: r.created_at,
  }));
  return { list: listData, total };
}

/**
 * 兼容 JSON 列解析（mysql2 对 JSON 列自动反序列化为对象；旧数据可能是字符串）
 * @param {*} v - 字段值
 * @returns {*} 解析后的对象或 null
 */
function parseJsonField(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
}

/**
 * 按 ID 查询
 * @param {number} id - 脚本 ID
 * @returns {Promise<Object|null>} 原始行（含 JSON 解析）
 */
async function getById(id) {
  const rows = await db.query('SELECT * FROM push_scripts WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  const r = rows[0];
  r.mention_targets = parseJsonField(r.mention_targets);
  r.condition_config = parseJsonField(r.condition_config);
  return r;
}

/**
 * 校验输入
 * @param {Object} data - 脚本字段
 * @param {number} [excludeId] - 编辑时排除自身
 */
async function validateInput(data, excludeId) {
  if (!data.name || !String(data.name).trim()) throw new ValidationError('脚本名称不能为空');
  if (!['daily', 'cron'].includes(data.scheduleType)) throw new ValidationError('触发类型非法');
  if (!data.scheduleValue) throw new ValidationError('触发时间不能为空');
  if (data.scheduleType === 'daily') {
    if (!DAILY_RE.test(data.scheduleValue)) throw new ValidationError('每天固定时间格式须为 HH:mm');
  } else {
    if (!cron.validate(data.scheduleValue)) {
      throw new BusinessError('cron 表达式非法', null, ErrorCode.PUSH_INVALID_CRON);
    }
  }
  if (!data.timezone || !TZ_RE.test(data.timezone)) {
    throw new ValidationError('时区非法');
  }
  if (!data.webhookId) throw new ValidationError('请选择目标群');
  const webhook = await webhookService.getById(data.webhookId);
  if (!webhook) throw new NotFoundError('群机器人不存在');
  if (!webhook.enabled) {
    throw new BusinessError('所选群机器人已停用', null, ErrorCode.PUSH_WEBHOOK_DISABLED);
  }
  if (!['text', 'markdown'].includes(data.msgtype)) throw new ValidationError('消息类型非法');
  if (!data.templateContent || !String(data.templateContent).trim()) {
    throw new BusinessError('消息模板不能为空', null, ErrorCode.PUSH_INVALID_TEMPLATE);
  }
  if (!['none', 'all', 'roles', 'users', 'filtered'].includes(data.mentionType)) {
    throw new ValidationError('@ 方式非法');
  }
  if (data.mentionType === 'roles' && (!Array.isArray(data.mentionTargets) || data.mentionTargets.length === 0)) {
    throw new ValidationError('按角色 @ 时至少选择一个角色');
  }
  if (data.mentionType === 'users' && (!Array.isArray(data.mentionTargets) || data.mentionTargets.length === 0)) {
    throw new ValidationError('指定人员 @ 时至少选择一人');
  }
  if (data.mentionType === 'filtered') {
    if (!data.mentionSource) {
      throw new ValidationError('按条件筛选 @ 时请选择数据源');
    }
    const meta = require('./data-source.service').getSourceMeta();
    const sourceMeta = meta.find((s) => s.id === data.mentionSource);
    if (!sourceMeta || !sourceMeta.people || sourceMeta.people.length === 0) {
      throw new ValidationError('所选数据源不支持人员名单筛选');
    }
  }
  conditionService.assertValid(data.conditionConfig);
  // 兜底：excludeId 参数仅为保持签名一致，删除时无需使用
  void excludeId;
}

/**
 * 组装入库字段
 * @param {Object} data - 前端输入
 * @param {number} userId - 操作人
 * @returns {Array}
 */
function buildFields(data, userId) {
  return [
    String(data.name).trim(),
    data.description || '',
    data.status === 'enabled' ? 'enabled' : 'disabled',
    data.scheduleType,
    String(data.scheduleValue).trim(),
    data.timezone || 'Asia/Shanghai',
    data.webhookId,
    data.msgtype,
    String(data.templateContent),
    data.mentionType || 'none',
    JSON.stringify(data.mentionTargets || []),
    data.mentionSource || null,
    JSON.stringify(data.conditionConfig),
    Math.min(Number(data.retryTimes) || 0, 5),
    Math.min(Math.max(Number(data.retryInterval) || 60, 10), 3600),
    Math.min(Math.max(Number(data.maxDailySends) || 20, 1), 100),
    data.notifyOnFail === false ? 0 : 1,
    userId || null,
  ];
}

/**
 * 新建
 * @param {Object} data - 脚本字段
 * @param {number} userId - 操作人
 * @returns {Promise<{id: number}>}
 */
async function create(data, userId) {
  await validateInput(data);
  const [result] = await db.execute(
    `INSERT INTO push_scripts
       (name, description, status, schedule_type, schedule_value, timezone, webhook_id,
        msgtype, template_content, mention_type, mention_targets, mention_source, condition_config,
        retry_times, retry_interval, max_daily_sends, notify_on_fail, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    buildFields(data, userId)
  );
  // 延迟 require 避免与 push.task → executor 循环依赖
  const pushTask = require('../../../common/tasks/push.task');
  await pushTask.syncScripts();
  return { id: result.insertId };
}

/**
 * 编辑
 * @param {number} id - 脚本 ID
 * @param {Object} data - 脚本字段
 * @returns {Promise<{id: number}>}
 */
async function update(id, data) {
  const script = await getById(id);
  if (!script) throw new NotFoundError('推送脚本不存在');
  await validateInput(data, id);
  await db.execute(
    `UPDATE push_scripts SET
       name = ?, description = ?, status = ?, schedule_type = ?, schedule_value = ?, timezone = ?,
       webhook_id = ?, msgtype = ?, template_content = ?, mention_type = ?, mention_targets = ?,
       mention_source = ?, condition_config = ?, retry_times = ?, retry_interval = ?, max_daily_sends = ?, notify_on_fail = ?
     WHERE id = ?`,
    [...buildFields(data, script.created_by).slice(0, 17), id]
  );
  const pushTask = require('../../../common/tasks/push.task');
  await pushTask.syncScripts();
  return { id };
}

/**
 * 删除
 * @param {number} id - 脚本 ID
 * @returns {Promise<{deleted: boolean}>}
 */
async function remove(id) {
  const script = await getById(id);
  if (!script) throw new NotFoundError('推送脚本不存在');
  await db.execute('DELETE FROM push_scripts WHERE id = ?', [id]);
  const pushTask = require('../../../common/tasks/push.task');
  await pushTask.syncScripts();
  return { deleted: true };
}

/**
 * 启停（熔断禁用后可手动恢复，恢复时清零熔断计数）
 * @param {number} id - 脚本 ID
 * @param {boolean} enabled - 目标状态
 * @returns {Promise<{id: number, enabled: boolean}>}
 */
async function toggle(id, enabled) {
  const script = await getById(id);
  if (!script) throw new NotFoundError('推送脚本不存在');
  await db.execute(
    'UPDATE push_scripts SET status = ?, consecutive_failures = ? WHERE id = ?',
    [enabled ? 'enabled' : 'disabled', enabled ? 0 : script.consecutive_failures || 0, id]
  );
  const pushTask = require('../../../common/tasks/push.task');
  await pushTask.syncScripts();
  return { id, enabled: !!enabled };
}

module.exports = { list, getById, create, update, remove, toggle };
