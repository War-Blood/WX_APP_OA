'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 答题设置服务 — 读取/更新键值
 */

const ALLOWED_KEYS = ['use_learn', 'check_user'];

/**
 * 读取答题设置
 * @returns {Promise<Object>} { use_learn, check_user }
 */
async function get() {
  const rows = await db.query('SELECT setting_key, setting_value FROM exam_settings');
  const settings = {};
  rows.forEach((r) => { settings[r.setting_key] = r.setting_value; });
  return settings;
}

/**
 * 更新答题设置
 * @param {Array} entries - [{ key, value }]
 * @returns {Promise<Object>} { updated }
 */
async function update(entries) {
  if (!Array.isArray(entries) || !entries.length) {
    throw new ValidationError('设置项不能为空');
  }
  for (const entry of entries) {
    if (!ALLOWED_KEYS.includes(entry.key)) {
      throw new BusinessError(`非法设置项: ${entry.key}`, null, ErrorCode.ANSWER_SETTING_INVALID);
    }
    if (!['0', '1', 0, 1].includes(entry.value)) {
      throw new BusinessError(`设置值必须为 0/1: ${entry.key}`, null, ErrorCode.ANSWER_SETTING_INVALID);
    }
    await db.execute(
      `INSERT INTO exam_settings (setting_key, setting_value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [entry.key, String(entry.value)]
    );
  }
  return { updated: true };
}

module.exports = { get, update };
