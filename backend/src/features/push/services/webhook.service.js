'use strict';

const db = require('../../../common/config/database');
const sender = require('./sender.service');
const { ValidationError, NotFoundError, BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 群机器人配置管理
 * 设置方式：后台仅提供「名称 + Webhook 地址（或 Key）」即可使用；
 * 凭证存库、脱敏零回显；可选加签密钥（安全增强，未开启加签的机器人自动兼容）。
 */

const KEY_RE = /^[A-Za-z0-9\-_]{8,}$/;
const WEBHOOK_URL_RE = /^https?:\/\/[^\/]+\/cgi-bin\/webhook\/send\?key=([A-Za-z0-9\-_]{8,})/;

/**
 * 从输入解析 webhook key（支持完整 URL 或纯 key）
 * @param {string} input - webhook URL 或 key
 * @returns {string|null} 解析出的 key
 */
function extractKey(input) {
  if (!input) return null;
  const v = String(input).trim();
  const urlMatch = WEBHOOK_URL_RE.exec(v);
  if (urlMatch) return urlMatch[1];
  if (KEY_RE.test(v)) return v;
  return null;
}

/**
 * 脱敏 key：保留后 4 位
 * @param {string} key - webhook key
 * @returns {string} 如 "xxxx…1234"
 */
function maskKey(key) {
  if (!key) return '';
  if (key.length <= 8) return '****' + key.slice(-4);
  return 'x'.repeat(Math.max(4, key.length - 8)) + key.slice(-4);
}

/**
 * 分页查询（凭证零回显：仅脱敏摘要）
 * @param {Object} params - {page, pageSize, keyword}
 * @returns {Promise<{list: Array, total: number}>}
 */
async function list({ page = 1, pageSize = 20, keyword } = {}) {
  const conditions = [];
  const params = [];
  if (keyword) {
    conditions.push('(name LIKE ? OR remark LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await db.query(`SELECT COUNT(*) AS total FROM push_webhooks ${where}`, params);
  const total = Number(countRows[0]?.total) || 0;

  const offset = (Number(page) - 1) * Number(pageSize);
  const rows = await db.query(
    `SELECT id, name, webhook_key, enabled, remark, created_at
     FROM push_webhooks ${where}
     ORDER BY id ASC
     LIMIT ? OFFSET ?`,
    [...params, Number(pageSize), offset]
  );

  const listData = rows.map((r) => ({
    id: r.id,
    name: r.name,
    maskedKey: maskKey(r.webhook_key),
    enabled: !!r.enabled,
    configured: sender.isConfigured(r),
    remark: r.remark || '',
    createdAt: r.created_at,
  }));
  return { list: listData, total };
}

/**
 * 按 ID 查询（供脚本等使用，返回含凭证的原始行——仅服务端内部使用）
 * @param {number} id - 机器人 ID
 * @returns {Promise<Object|null>}
 */
async function getById(id) {
  const rows = await db.query('SELECT * FROM push_webhooks WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 校验输入
 * @param {Object} data - {name, webhookUrl|webhookKey, secret}
 * @param {boolean} [allowEmptyKey=false] - 编辑场景：key 留空=保持原值
 */
function validateInput(data, allowEmptyKey = false) {
  if (!data.name || !String(data.name).trim()) {
    throw new ValidationError('名称不能为空');
  }
  if (String(data.name).length > 50) {
    throw new ValidationError('名称不能超过 50 字符');
  }
  if (!allowEmptyKey) {
    const input = data.webhookUrl || data.webhookKey;
    if (!extractKey(input)) {
      throw new ValidationError('请填写有效的企微群机器人 Webhook 地址或 Key');
    }
  }
  if (data.secret && !KEY_RE.test(data.secret)) {
    throw new ValidationError('加签密钥须为至少 8 位字母/数字/下划线/连字符');
  }
}

/**
 * 校验"启用"前置条件：凭证必须可用
 * @param {Object} webhook - push_webhooks 行
 */
function assertEnabledAllowed(webhook) {
  if (!sender.isConfigured(webhook)) {
    throw new BusinessError('请先填写有效的 Webhook 地址或 Key', null, ErrorCode.PUSH_WEBHOOK_NOT_CONFIGURED);
  }
}

/**
 * 新建
 * @param {Object} data - {name, webhookUrl|webhookKey, secret, enabled, remark}
 * @param {number} userId - 操作人
 * @returns {Promise<{id: number}>}
 */
async function create(data, userId) {
  validateInput(data);
  const webhookKey = extractKey(data.webhookUrl || data.webhookKey);
  const secret = data.secret ? String(data.secret).trim() : null;

  const [result] = await db.execute(
    `INSERT INTO push_webhooks (name, credential_type, webhook_key, secret, enabled, remark)
     VALUES (?, 'direct', ?, ?, ?, ?)`,
    [String(data.name).trim(), webhookKey, secret, data.enabled ? 1 : 0, data.remark || '']
  );
  const id = result.insertId;
  const row = await getById(id);
  if (data.enabled) assertEnabledAllowed(row);
  return { id };
}

/**
 * 编辑（key/secret 留空 = 保持原值不修改）
 * @param {number} id - 机器人 ID
 * @param {Object} data - 同 create
 * @returns {Promise<{id: number}>}
 */
async function update(id, data) {
  const webhook = await getById(id);
  if (!webhook) throw new NotFoundError('群机器人不存在');

  validateInput(data, true);
  let webhookKey = webhook.webhook_key;
  let secret = webhook.secret;
  const newKey = extractKey(data.webhookUrl || data.webhookKey);
  if (newKey) webhookKey = newKey;
  if (!webhookKey) throw new ValidationError('请填写有效的企微群机器人 Webhook 地址或 Key');
  if (data.secret !== undefined && data.secret !== null && String(data.secret).trim() !== '') {
    secret = String(data.secret).trim();
  }

  await db.execute(
    `UPDATE push_webhooks SET name = ?, webhook_key = ?, secret = ?, enabled = ?, remark = ? WHERE id = ?`,
    [String(data.name).trim(), webhookKey, secret, data.enabled ? 1 : 0, data.remark || '', id]
  );
  const row = await getById(id);
  if (data.enabled) assertEnabledAllowed(row);
  return { id };
}

/**
 * 删除（被脚本引用时拒绝）
 * @param {number} id - 机器人 ID
 * @returns {Promise<{deleted: boolean}>}
 */
async function remove(id) {
  const webhook = await getById(id);
  if (!webhook) throw new NotFoundError('群机器人不存在');
  const refs = await db.query('SELECT COUNT(*) AS cnt FROM push_scripts WHERE webhook_id = ?', [id]);
  if (Number(refs[0]?.cnt) > 0) {
    throw new BusinessError('该群机器人仍被推送脚本引用，请先修改脚本', null, ErrorCode.PUSH_WEBHOOK_NOT_FOUND);
  }
  await db.execute('DELETE FROM push_webhooks WHERE id = ?', [id]);
  return { deleted: true };
}

/**
 * 启停
 * @param {number} id - 机器人 ID
 * @param {boolean} enabled - 目标状态
 * @returns {Promise<{id: number, enabled: boolean}>}
 */
async function toggle(id, enabled) {
  const webhook = await getById(id);
  if (!webhook) throw new NotFoundError('群机器人不存在');
  if (enabled) assertEnabledAllowed(webhook);
  await db.execute('UPDATE push_webhooks SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
  return { id, enabled: !!enabled };
}

module.exports = { list, getById, create, update, remove, toggle, extractKey, maskKey };
