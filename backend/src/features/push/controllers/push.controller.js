'use strict';

const db = require('../../../common/config/database');
const { success } = require('../../../common/utils/response');
const webhookService = require('../services/webhook.service');
const scriptService = require('../services/script.service');
const executorService = require('../services/executor.service');
const logService = require('../services/log.service');
const dataSourceService = require('../services/data-source.service');

/**
 * 推送管理控制器
 * 安全：所有写操作写 operation_logs 审计（模块=PUSH）；响应不含任何凭证。
 */

/**
 * 写操作审计
 * @param {number} userId - 操作人
 * @param {string} action - 动作
 * @param {string} targetType - 目标类型
 * @param {number} targetId - 目标 ID
 * @param {string} detail - 详情
 */
async function audit(userId, action, targetType, targetId, detail) {
  try {
    await db.execute(
      `INSERT INTO operation_logs (user_id, action, module, target_type, target_id, detail, created_at)
       VALUES (?, ?, 'PUSH', ?, ?, ?, NOW())`,
      [userId, action, targetType, targetId || null, detail || '']
    );
  } catch (err) {
    // 审计失败不影响主流程
  }
}

// ==================== 群机器人 ====================

/** 列表 */
async function webhookList(req, res, next) {
  try {
    const { page = 1, pageSize = 20, keyword } = req.body;
    const result = await webhookService.list({ page, pageSize, keyword });
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 新建 */
async function webhookCreate(req, res, next) {
  try {
    const { name, envName, enabled, remark } = req.body;
    const result = await webhookService.create({ name, envName, enabled, remark }, req.user.userId);
    await audit(req.user.userId, 'push_webhook_create', 'push_webhook', result.id, `新建群机器人 ${name}`);
    res.json(success(result, '群机器人已创建'));
  } catch (err) { next(err); }
}

/** 编辑 */
async function webhookUpdate(req, res, next) {
  try {
    const { id, name, envName, enabled, remark } = req.body;
    const result = await webhookService.update(id, { name, envName, enabled, remark });
    await audit(req.user.userId, 'push_webhook_update', 'push_webhook', id, `编辑群机器人 ${name}`);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 删除 */
async function webhookDelete(req, res, next) {
  try {
    const { id } = req.body;
    const result = await webhookService.remove(id);
    await audit(req.user.userId, 'push_webhook_delete', 'push_webhook', id, '删除群机器人');
    res.json(success(result, '已删除'));
  } catch (err) { next(err); }
}

/** 启停 */
async function webhookToggle(req, res, next) {
  try {
    const { id, enabled } = req.body;
    const result = await webhookService.toggle(id, enabled);
    await audit(req.user.userId, 'push_webhook_toggle', 'push_webhook', id, `启用=${enabled}`);
    res.json(success(result));
  } catch (err) { next(err); }
}

// ==================== 脚本 ====================

/** 列表 */
async function scriptList(req, res, next) {
  try {
    const { page = 1, pageSize = 20, keyword, status } = req.body;
    const result = await scriptService.list({ page, pageSize, keyword, status });
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 详情 */
async function scriptDetail(req, res, next) {
  try {
    const { id } = req.body;
    const script = await scriptService.getById(id);
    if (!script) {
      const { NotFoundError } = require('../../../common/utils/errors');
      throw new NotFoundError('推送脚本不存在');
    }
    res.json(success({
      id: script.id,
      name: script.name,
      description: script.description || '',
      status: script.status,
      scheduleType: script.schedule_type,
      scheduleValue: script.schedule_value,
      timezone: script.timezone,
      webhookId: script.webhook_id,
      msgtype: script.msgtype,
      templateContent: script.template_content,
      mentionType: script.mention_type,
      mentionTargets: script.mention_targets || [],
      conditionConfig: script.condition_config,
      retryTimes: script.retry_times,
      retryInterval: script.retry_interval,
      maxDailySends: script.max_daily_sends,
      consecutiveFailures: script.consecutive_failures,
      notifyOnFail: !!script.notify_on_fail,
    }));
  } catch (err) { next(err); }
}

/** 新建 */
async function scriptCreate(req, res, next) {
  try {
    const result = await scriptService.create(req.body, req.user.userId);
    await audit(req.user.userId, 'push_script_create', 'push_script', result.id, `新建推送脚本 ${req.body.name}`);
    res.json(success(result, '脚本已创建'));
  } catch (err) { next(err); }
}

/** 编辑 */
async function scriptUpdate(req, res, next) {
  try {
    const { id, ...data } = req.body;
    const result = await scriptService.update(id, data);
    await audit(req.user.userId, 'push_script_update', 'push_script', id, `编辑推送脚本 ${data.name}`);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 删除 */
async function scriptDelete(req, res, next) {
  try {
    const { id } = req.body;
    const result = await scriptService.remove(id);
    await audit(req.user.userId, 'push_script_delete', 'push_script', id, '删除推送脚本');
    res.json(success(result, '已删除'));
  } catch (err) { next(err); }
}

/** 启停 */
async function scriptToggle(req, res, next) {
  try {
    const { id, enabled } = req.body;
    const result = await scriptService.toggle(id, enabled);
    await audit(req.user.userId, 'push_script_toggle', 'push_script', id, `启用=${enabled}`);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 手动测试（dryRun 或真实发送） */
async function scriptTest(req, res, next) {
  try {
    const { id, dryRun = true } = req.body;
    const result = await executorService.testScript(id, { dryRun: !!dryRun, userId: req.user.userId });
    await audit(req.user.userId, 'push_script_test', 'push_script', id, dryRun ? 'dryRun 测试' : '真实发送测试');
    res.json(success(result));
  } catch (err) { next(err); }
}

// ==================== 日志 ====================

/** 日志列表 */
async function logList(req, res, next) {
  try {
    const { page = 1, pageSize = 20, scriptId, status, startDate, endDate } = req.body;
    const result = await logService.listLogs({ page, pageSize, scriptId, status, startDate, endDate });
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 日志详情 */
async function logDetail(req, res, next) {
  try {
    const { id } = req.body;
    const log = await logService.getLog(id);
    if (!log) {
      const { NotFoundError } = require('../../../common/utils/errors');
      throw new NotFoundError('执行日志不存在');
    }
    res.json(success(log));
  } catch (err) { next(err); }
}

// ==================== 数据源元信息 ====================

/** 数据源元信息（条件编辑器渲染） */
async function dataSources(req, res, next) {
  try {
    res.json(success({ sources: dataSourceService.getSourceMeta() }));
  } catch (err) { next(err); }
}

module.exports = {
  webhookList, webhookCreate, webhookUpdate, webhookDelete, webhookToggle,
  scriptList, scriptDetail, scriptCreate, scriptUpdate, scriptDelete, scriptToggle, scriptTest,
  logList, logDetail,
  dataSources,
};
