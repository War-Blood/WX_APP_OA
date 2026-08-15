'use strict';

const db = require('../../../common/config/database');

/**
 * @ 目标解析
 * - none: 不 @
 * - all: 所有在职员工
 * - roles: 指定角色
 * - users: 指定用户
 * - filtered: 按条件筛选——从数据源人员名单取"不满足人员"（动态，如 daily_report.missing_workers），
 *             名单为空（全员满足）→ 不触发 @
 * text 消息 → mentioned_mobile_list（users.phone）
 * markdown 消息 → mentioned_list（users.qywx_userid），内容中嵌入 <@userid>
 * 无对应标识的用户跳过并在 detail 记录原因。
 */

/**
 * 解析 @ 目标
 * @param {Object} script - push_scripts 行（含 mention_type / mention_targets / mention_source / msgtype）
 * @param {Object} [context] - 数据源上下文（mention_type='filtered' 时必传）
 * @returns {Promise<{mobileList: string[], useridList: string[], names: string[], detail: Array}>}
 */
async function resolve(script, context) {
  const mentionType = script.mention_type || 'none';
  const detail = [];
  const mobileList = [];
  const useridList = [];
  const nameSet = [];

  if (mentionType === 'none') {
    return { mobileList, useridList, names: [], detail };
  }

  // 按条件筛选：从数据源人员名单取"不满足人员"
  if (mentionType === 'filtered') {
    const source = script.mention_source;
    const sourceCtx = source && context ? context[source] : null;
    const people = sourceCtx && Array.isArray(sourceCtx.missing_workers) ? sourceCtx.missing_workers : [];
    if (people.length === 0) {
      detail.push({ reason: '全员满足，无触发 @ 人员' });
      return { mobileList, useridList, names: [], detail };
    }
    const seenNames = new Set();
    people.forEach((p) => {
      const name = p.name || `用户${p.userId}`;
      if (!seenNames.has(name)) {
        seenNames.add(name);
        nameSet.push(name);
      }
      if (script.msgtype === 'markdown') {
        if (p.qywxUserid) {
          useridList.push(p.qywxUserid);
        } else {
          detail.push({ id: p.userId, name, reason: '未绑定企业微信（无 qywx_userid），markdown @ 已跳过' });
        }
      } else {
        if (p.phone) {
          mobileList.push(p.phone);
        } else {
          detail.push({ id: p.userId, name, reason: '无手机号，text @ 已跳过' });
        }
      }
    });
    return { mobileList, useridList, names: nameSet, detail };
  }

  let rows = [];
  if (mentionType === 'all') {
    rows = await db.query(
      `SELECT id, user_name, nickname, phone, qywx_userid
       FROM users
       WHERE deleted_at IS NULL AND status = 'active' AND role NOT IN ('admin','superadmin')
       ORDER BY user_name`
    );
  } else if (mentionType === 'roles') {
    const roles = Array.isArray(script.mention_targets) ? script.mention_targets : [];
    if (roles.length === 0) return { mobileList, useridList, names: [], detail };
    const placeholders = roles.map(() => '?').join(',');
    rows = await db.query(
      `SELECT id, user_name, nickname, phone, qywx_userid
       FROM users
       WHERE deleted_at IS NULL AND status = 'active' AND role IN (${placeholders})
       ORDER BY user_name`,
      roles
    );
  } else if (mentionType === 'users') {
    const ids = Array.isArray(script.mention_targets) ? script.mention_targets : [];
    if (ids.length === 0) return { mobileList, useridList, names: [], detail };
    const placeholders = ids.map(() => '?').join(',');
    rows = await db.query(
      `SELECT id, user_name, nickname, phone, qywx_userid
       FROM users
       WHERE deleted_at IS NULL AND status = 'active' AND id IN (${placeholders})
       ORDER BY user_name`,
      ids
    );
  }

  const seenNames = new Set();
  rows.forEach((u) => {
    const name = u.user_name || u.nickname || `用户${u.id}`;
    if (!seenNames.has(name)) {
      seenNames.add(name);
      nameSet.push(name);
    }
    if (script.msgtype === 'markdown') {
      if (u.qywx_userid) {
        useridList.push(u.qywx_userid);
      } else {
        detail.push({ id: u.id, name, reason: '未绑定企业微信（无 qywx_userid），markdown @ 已跳过' });
      }
    } else {
      if (u.phone) {
        mobileList.push(u.phone);
      } else {
        detail.push({ id: u.id, name, reason: '无手机号，text @ 已跳过' });
      }
    }
  });

  return { mobileList, useridList, names: nameSet, detail };
}

module.exports = { resolve };
