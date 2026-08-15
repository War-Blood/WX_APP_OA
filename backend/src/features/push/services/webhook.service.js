'use strict';

const db = require('../../../common/config/database');
const sender = require('./sender.service');
const { ValidationError, NotFoundError, BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 群机器人配置管理
 * 安全：凭证只存服务端 env，本服务仅维护引用名（env_name）与展示信息。
 */

const ENV_NAME_RE = /^[A-Za-z0-9_]{2,50}$/;

/**
 * 分页查询
 * @param {Object} params - {page, pageSize, keyword}
 * @returns {Promise<{list: Array, total: number}>}
 */
async function list({ page = 1, pageSize = 20, keyword } = {}) {
  const conditions = [];
  const params = [];
  if (keyword) {
    conditions.push('(name LIKE ? OR env_name LIKE ? OR remark LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await db.query(`SELECT COUNT(*) AS total FROM push_webhooks ${where}`, params);
  const total = Number(countRows[0]?.total) || 0;

  const offset = (Number(page) - 1) * Number(pageSize);
  const rows = await db.query(
    `SELECT id, name, env_name, enabled, remark, created_at
     FROM push_webhooks ${where}
     ORDER BY id ASC
     LIMIT ? OFFSET ?`,
    [...params, Number(pageSize), offset]
  );

  const listData = rows.map((r) => ({
    id: r.id,
    name: r.name,
    envName: r.env_name,
    enabled: !!r.enabled,
    configured: sender.isConfigured(r.env_name),
    remark: r.remark || '',
    createdAt: r.created_at,
  }));
  return { list: listData, total };
}

/**
 * 按 ID 查询（供脚本等使用）
 * @param {number} id - 机器人 ID
 * @returns {Promise<Object|null>}
 */
async function getById(id) {
  const rows = await db.query('SELECT * FROM push_webhooks WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 校验输入
 * @param {Object} data - {name, envName, enabled, remark}
 */
function validateInput(data) {
  if (!data.name || !String(data.name).trim()) {
    throw new ValidationError('名称不能为空');
  }
  if (String(data.name).length > 50) {
    throw new ValidationError('名称不能超过 50 字符');
  }
  if (!data.envName || !ENV_NAME_RE.test(data.envName)) {
    throw new ValidationError('env 引用名须为 2-50 位字母/数字/下划线');
  }
  if (data.enabled) {
    if (!sender.isConfigured(data.envName)) {
      throw new BusinessError(
        `凭证未配置：请在 .env 中添加 WECOM_ROBOT_${data.envName}_KEY 与 _SECRET 并重启`,
        null,
        ErrorCode.PUSH_WEBHOOK_NOT_CONFIGURED
      );
    }
  }
}

/**
 * 新建
 * @param {Object} data - {name, envName, enabled, remark}
 * @param {number} userId - 操作人
 * @returns {Promise<{id: number}>}
 */
async function create(data, userId) {
  validateInput(data);
  const exist = await db.query('SELECT id FROM push_webhooks WHERE env_name = ?', [data.envName]);
  if (exist.length > 0) {
    throw new BusinessError('该 env 引用名已被使用', null, ErrorCode.PUSH_WEBHOOK_NOT_FOUND);
  }
  const [result] = await db.execute(
    `INSERT INTO push_webhooks (name, env_name, enabled, remark)
     VALUES (?, ?, ?, ?)`,
    [String(data.name).trim(), data.envName, data.enabled ? 1 : 0, data.remark || '']
  );
  return { id: result.insertId };
}

/**
 * 编辑
 * @param {number} id - 机器人 ID
 * @param {Object} data - {name, envName, enabled, remark}
 * @returns {Promise<{id: number}>}
 */
async function update(id, data) {
  const webhook = await getById(id);
  if (!webhook) throw new NotFoundError('群机器人不存在');

  validateInput(data);
  const dup = await db.query(
    'SELECT id FROM push_webhooks WHERE env_name = ? AND id != ?',
    [data.envName, id]
  );
  if (dup.length > 0) {
    throw new BusinessError('该 env 引用名已被使用', null, ErrorCode.PUSH_WEBHOOK_NOT_FOUND);
  }
  await db.execute(
    'UPDATE push_webhooks SET name = ?, env_name = ?, enabled = ?, remark = ? WHERE id = ?',
    [String(data.name).trim(), data.envName, data.enabled ? 1 : 0, data.remark || '', id]
  );
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
  if (enabled && !sender.isConfigured(webhook.env_name)) {
    throw new BusinessError('凭证未配置，无法启用', null, ErrorCode.PUSH_WEBHOOK_NOT_CONFIGURED);
  }
  await db.execute('UPDATE push_webhooks SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
  return { id, enabled: !!enabled };
}

module.exports = { list, getById, create, update, remove, toggle };
