'use strict';

const db = require('../../../common/config/database');
const redis = require('../../../common/config/redis');
const logger = require('../../../common/utils/logger');
const dataSourceService = require('./data-source.service');
const conditionService = require('./condition.service');
const templateService = require('./template.service');
const mentionService = require('./mention.service');
const senderService = require('./sender.service');
const webhookService = require('./webhook.service');
const scriptService = require('./script.service');
const logService = require('./log.service');
const { BusinessError, AppError, NotFoundError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 推送执行编排
 * 链路：锁 → 幂等 → 限流 → 数据源 → 条件判定 → @ 解析 → 模板渲染 → 发送(重试) → 落库 → 熔断 → 告警
 */

const LOCK_PREFIX = 'oa:push:lock:';
const DAILY_PREFIX = 'oa:push:daily:';
const TEST_PREFIX = 'oa:push:test:';
const FUSE_THRESHOLD = 3;
const TEST_RATE_LIMIT = 3;

/**
 * 生成调度键（时区安全的 yyyyMMddHHmm）
 * @param {string} timezone - IANA 时区
 * @returns {string}
 */
function scheduleKey(timezone) {
  const parts = dataSourceService.getDateParts(timezone);
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts2 = fmt.formatToParts(now);
  const map = {};
  parts2.forEach((p) => { if (p.type !== 'literal') map[p.type] = p.value; });
  return `${parts.date.replace(/-/g, '')}${map.hour}${map.minute}`;
}

/**
 * Redis 操作容错包装（Redis 不可用时降级，靠 DB 幂等键防重）
 * @param {Function} fn - Redis 操作
 * @returns {Promise<*>} 结果或 null
 */
async function withRedis(fn) {
  try {
    const client = redis.getClient();
    return await fn(client);
  } catch (err) {
    logger.warn('[PushExecutor] Redis 不可用，本次降级处理', { module: 'PUSH', error: err.message });
    return null;
  }
}

/**
 * 站内消息告警（仅 superadmin 角色）
 * @param {string} title - 标题
 * @param {string} description - 描述
 * @param {string} content - 详情
 * @returns {Promise<number>} 通知条数
 */
async function notifySuperAdmins(title, description, content) {
  const admins = await db.query(
    `SELECT id FROM users
     WHERE role = 'superadmin' AND deleted_at IS NULL AND status = 'active'`
  );
  let count = 0;
  for (const admin of admins) {
    await db.execute(
      `INSERT INTO messages (receiver_id, type, title, description, content, is_read, created_at)
       VALUES (?, 'push_fail', ?, ?, ?, 0, NOW())`,
      [admin.id, title, description, content]
    );
    count++;
  }
  return count;
}

/**
 * 执行完整推送链路
 * @param {Object} script - push_scripts 行（JSON 已解析）
 * @param {Object} opts - {isTest: boolean, scheduleKey: string}
 * @returns {Promise<Object>} 执行结果摘要
 */
async function execute(script, opts = {}) {
  const isTest = !!opts.isTest;
  const key = opts.scheduleKey || scheduleKey(script.timezone);
  const startedAt = Date.now();

  // 1. Redis 锁（测试跳过：测试键唯一）
  if (!isTest) {
    const locked = await withRedis((c) => c.set(`${LOCK_PREFIX}${script.id}:${key}`, '1', { NX: true, EX: 60 }));
    if (locked === false) {
      logger.info('[PushExecutor] 同分钟已被其他实例执行，跳过', { module: 'PUSH', scriptId: script.id, key });
      return { skipped: true, reason: 'lock_conflict' };
    }
  }

  // 2. 幂等日志
  const log = await logService.createLog(script.id, key);
  if (!log.inserted) {
    return { skipped: true, reason: 'duplicated' };
  }

  try {
    // 3. 每日限流（测试跳过）
    if (!isTest) {
      const day = key.slice(0, 8);
      const dailyKey = `${DAILY_PREFIX}${script.id}:${day}`;
      const count = await withRedis(async (c) => {
        const n = await c.incr(dailyKey);
        if (n === 1) await c.expire(dailyKey, 86400);
        return n;
      });
      if (count && count > script.max_daily_sends) {
        await logService.updateLog(log.id, {
          send_status: 'skipped',
          error_message: `超过每日发送上限(${script.max_daily_sends})`,
          duration_ms: Date.now() - startedAt,
        });
        await updateScriptSummary(script.id, 'skipped', 'daily_limit');
        return { skipped: true, reason: 'daily_limit' };
      }
    }

    // 4. 加载数据源
    const { context, errors } = await dataSourceService.loadContext(script.timezone);
    const loadErrors = Object.keys(errors).map((k) => `${k}: ${errors[k]}`).join('; ');

    // 5. 条件判定
    const cond = conditionService.evaluate(script.condition_config, context);
    if (!cond.passed) {
      await logService.updateLog(log.id, {
        condition_result: 'fail',
        condition_detail: cond.details,
        send_status: 'condition_fail',
        error_message: loadErrors || (cond.details.filter((d) => d.reason).map((d) => d.reason).join('; ') || null),
        duration_ms: Date.now() - startedAt,
      });
      await updateScriptSummary(script.id, 'condition_fail', null);
      return { skipped: true, reason: 'condition_fail', details: cond.details };
    }

    // 6. @ 目标解析
    const mentions = await mentionService.resolve(script);

    // 7. 模板渲染
    const parts = dataSourceService.getDateParts(script.timezone);
    const datesAgo = {};
    for (let n = 1; n <= 30; n++) {
      datesAgo[n] = dataSourceService.minusDays(parts.date, n);
    }
    const rendered = templateService.render(script.template_content, context, {
      date: parts.date,
      weekday: parts.weekday,
      time: new Date().toTimeString().slice(0, 8),
      scriptName: script.name,
      mentionNames: mentions.names.join('、'),
      datesAgo,
    });
    const limited = templateService.enforceLimit(script.msgtype, rendered.content);

    // 8. 发送（带重试）
    const webhook = await webhookService.getById(script.webhook_id);
    if (!webhook) throw new NotFoundError('群机器人不存在');
    if (!webhook.enabled) {
      throw new BusinessError('群机器人已停用', null, ErrorCode.PUSH_WEBHOOK_DISABLED);
    }
    const sendResult = await senderService.sendWithRetry(webhook, script.msgtype, limited.content, mentions, {
      retryTimes: script.retry_times,
      retryInterval: script.retry_interval,
    });

    const status = sendResult.success ? 'success' : 'failed';
    const finalAttempt = sendResult.attempts[sendResult.attempts.length - 1] || {};
    const errorMessage = sendResult.success
      ? (limited.truncated ? '内容超长已截断' : null)
      : (finalAttempt.error || finalAttempt.errmsg || '发送失败');

    // 9. 落库
    await logService.updateLog(log.id, {
      condition_result: 'pass',
      condition_detail: cond.details,
      rendered_content: limited.content,
      mention_detail: {
        names: mentions.names,
        mobileCount: mentions.mobileList.length,
        useridCount: mentions.useridList.length,
        skipped: mentions.detail,
      },
      send_status: status,
      attempts: sendResult.attempts,
      error_message: errorMessage,
      duration_ms: Date.now() - startedAt,
    });

    // 10. 熔断与摘要（测试不熔断、不告警）
    await updateScriptSummary(script.id, status, errorMessage, !isTest ? sendResult.success : null);

    if (!isTest && !sendResult.success && script.notify_on_fail) {
      const fused = script.consecutive_failures + 1 >= FUSE_THRESHOLD;
      const title = `【推送失败】${script.name}`;
      const description = fused ? '连续失败已达阈值，脚本已自动停用' : '消息发送失败';
      const content = `脚本：${script.name}\n时间：${new Date().toLocaleString('zh-CN', { timeZone: script.timezone })}\n错误：${errorMessage}${fused ? '\n状态：已自动停用（熔断）' : ''}`;
      await notifySuperAdmins(title, description, content);
    }

    return {
      success: sendResult.success,
      sendStatus: status,
      logId: log.id,
      durationMs: Date.now() - startedAt,
      truncated: limited.truncated,
      errorMessage: sendResult.success ? null : errorMessage,
    };
  } catch (err) {
    // 链路异常兜底
    await logService.updateLog(log.id, {
      condition_result: 'error',
      send_status: 'failed',
      error_message: err.message ? String(err.message).slice(0, 500) : '执行异常',
      duration_ms: Date.now() - startedAt,
    });
    await updateScriptSummary(script.id, 'failed', err.message);
    logger.error('[PushExecutor] 执行异常', { module: 'PUSH', scriptId: script.id, error: err.message });
    throw err;
  }
}

/**
 * 更新脚本最近执行摘要与熔断计数
 * @param {number} scriptId - 脚本 ID
 * @param {string} status - 执行状态
 * @param {string|null} error - 错误摘要
 * @param {boolean|null} succeeded - 是否成功（null=不更新熔断计数）
 */
async function updateScriptSummary(scriptId, status, error, succeeded = null) {
  const fields = ['last_run_at = NOW()', 'last_run_status = ?', 'last_error = ?'];
  const params = [status, error ? String(error).slice(0, 500) : null];
  if (succeeded !== null) {
    fields.push('consecutive_failures = IF(? = 1, 0, consecutive_failures + 1)');
    params.push(succeeded ? 1 : 0);
    if (succeeded === false) {
      // 达到阈值自动停用
      fields.push('status = IF(consecutive_failures + 1 >= ?, \'disabled\', status)');
      params.push(FUSE_THRESHOLD);
    }
  }
  params.push(scriptId);
  await db.execute(
    `UPDATE push_scripts SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

/**
 * 手动测试
 * @param {number} scriptId - 脚本 ID
 * @param {Object} opts - {dryRun: boolean, userId: number}
 * @returns {Promise<Object>}
 */
async function testScript(scriptId, { dryRun, userId } = {}) {
  const script = await scriptService.getById(scriptId);
  if (!script) throw new NotFoundError('推送脚本不存在');
  if (script.status !== 'enabled') {
    throw new BusinessError('脚本已停用，请先启用再测试', null, ErrorCode.PUSH_SCRIPT_DISABLED);
  }

  // 测试限流：同脚本每分钟 ≤3 次
  const minuteKey = dataSourceService.getDateParts(script.timezone).date + '-' + new Date().toTimeString().slice(0, 5);
  const count = await withRedis(async (c) => {
    const n = await c.incr(`${TEST_PREFIX}${script.id}:${minuteKey}`);
    if (n === 1) await c.expire(`${TEST_PREFIX}${script.id}:${minuteKey}`, 60);
    return n;
  });
  if (count && count > TEST_RATE_LIMIT) {
    throw new AppError(429, 429, '测试发送过于频繁，请 1 分钟后再试');
  }

  // dryRun：仅判定 + 渲染，不发送不落库
  if (dryRun) {
    const { context, errors } = await dataSourceService.loadContext(script.timezone);
    const cond = conditionService.evaluate(script.condition_config, context);
    const mentions = cond.passed ? await mentionService.resolve(script) : { names: [], detail: [] };
    const parts = dataSourceService.getDateParts(script.timezone);
    const datesAgo = {};
    for (let n = 1; n <= 30; n++) datesAgo[n] = dataSourceService.minusDays(parts.date, n);
    const rendered = templateService.render(script.template_content, context, {
      date: parts.date,
      weekday: parts.weekday,
      time: new Date().toTimeString().slice(0, 8),
      scriptName: script.name,
      mentionNames: mentions.names.join('、'),
      datesAgo,
    });
    const limited = templateService.enforceLimit(script.msgtype, rendered.content);
    return {
      dryRun: true,
      conditionResult: cond.passed ? 'pass' : 'fail',
      conditionDetail: cond.details,
      renderedContent: limited.content,
      truncated: limited.truncated,
      unknownVars: rendered.unknownVars,
      mentionDetail: { names: mentions.names, skipped: mentions.detail },
      dataSourceErrors: errors,
    };
  }

  // 真实发送：完整链路，schedule_key 用测试专用键（不参与幂等）
  const testKey = 'T' + Date.now().toString().slice(0, 13);
  const result = await execute(script, { isTest: true, scheduleKey: testKey });
  return { ...result, dryRun: false };
}

module.exports = { execute, testScript, scheduleKey };
