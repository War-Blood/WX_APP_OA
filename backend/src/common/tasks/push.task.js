'use strict';

const cron = require('node-cron');
const db = require('../config/database');
const executor = require('../../features/push/services/executor.service');
const logger = require('../utils/logger');

/**
 * 定时推送调度器
 * 动态注册：启动时加载全部 enabled 脚本并注册 node-cron；
 * 脚本 CRUD/启停后由 script.service 调用 syncScripts() 全量重同步。
 * 多实例安全：executor 内 Redis 锁 + DB 幂等键保证同分钟只执行一次。
 */

/** 已注册任务表：scriptId → ScheduledTask */
const tasks = new Map();

/**
 * daily "HH:mm" → cron 表达式
 * @param {string} hhmm - 如 "08:30"
 * @returns {string} cron 表达式
 */
function dailyToCron(hhmm) {
  const [h, m] = String(hhmm).split(':');
  return `${parseInt(m, 10)} ${parseInt(h, 10)} * * *`;
}

/**
 * 加载全部启用脚本（JSON 字段解析）
 * @returns {Promise<Array>}
 */
async function loadEnabledScripts() {
  const rows = await db.query("SELECT * FROM push_scripts WHERE status = 'enabled'");
  return rows.map((r) => {
    ['mention_targets', 'condition_config'].forEach((k) => {
      if (r[k]) {
        try { r[k] = JSON.parse(r[k]); } catch { r[k] = null; }
      }
    });
    return r;
  });
}

/**
 * 全量重同步调度（幂等：先停全部再注册）
 * @returns {Promise<number>} 注册的脚本数
 */
async function syncScripts() {
  tasks.forEach((t) => { try { t.stop(); } catch { /* noop */ } });
  tasks.clear();

  let scripts = [];
  try {
    scripts = await loadEnabledScripts();
  } catch (err) {
    logger.error('[PushTask] 加载脚本失败，调度未注册', { module: 'PUSH', error: err.message });
    return 0;
  }

  for (const script of scripts) {
    let expr = script.schedule_value;
    if (script.schedule_type === 'daily') {
      expr = dailyToCron(script.schedule_value);
    }
    if (!cron.validate(expr)) {
      logger.warn('[PushTask] 跳过非法 cron 脚本', { module: 'PUSH', scriptId: script.id, expr });
      continue;
    }
    const task = cron.schedule(expr, () => {
      runScript(script.id);
    }, { timezone: script.timezone || 'Asia/Shanghai' });
    tasks.set(script.id, task);
  }

  logger.info('[PushTask] 调度重同步完成', { module: 'PUSH', registered: tasks.size });
  return tasks.size;
}

/**
 * cron 回调：重新加载脚本快照后执行（避免引用过期配置）
 * @param {number} scriptId - 脚本 ID
 */
async function runScript(scriptId) {
  try {
    const rows = await db.query('SELECT * FROM push_scripts WHERE id = ? AND status = ?', [scriptId, 'enabled']);
    if (rows.length === 0) return;
    const script = rows[0];
    ['mention_targets', 'condition_config'].forEach((k) => {
      if (script[k]) {
        try { script[k] = JSON.parse(script[k]); } catch { script[k] = null; }
      }
    });
    const result = await executor.execute(script);
    logger.info('[PushTask] 脚本执行完成', {
      module: 'PUSH',
      scriptId,
      result: { ...result, details: undefined },
    });
  } catch (err) {
    logger.error('[PushTask] 脚本执行失败', { module: 'PUSH', scriptId, error: err.message });
  }
}

module.exports = { syncScripts, dailyToCron };
