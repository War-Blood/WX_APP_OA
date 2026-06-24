'use strict';

const cron = require('node-cron');
const reminderTask = require('./reminder.task');
const complianceTask = require('./compliance.task');
const statsService = require('../../features/compliance/services/stats.service');
const logger = require('../utils/logger');

console.log('[Scheduler] 初始化定时任务...');

// 每日22:00发送提醒
cron.schedule('0 22 * * *', async () => {
  logger.info('[Scheduler] Running 22:00 reminder task...');
  try {
    const result = await reminderTask.sendTripReminders('22:00');
    logger.info('[Scheduler] 22:00 reminder completed', result);
  } catch (err) {
    logger.error('[Scheduler] 22:00 reminder failed:', err);
  }
}, {
  timezone: 'Asia/Shanghai'
});

// 次日08:00再次提醒
cron.schedule('0 8 * * *', async () => {
  logger.info('[Scheduler] Running 08:00 reminder task...');
  try {
    const result = await reminderTask.sendTripReminders('08:00');
    logger.info('[Scheduler] 08:00 reminder completed', result);
  } catch (err) {
    logger.error('[Scheduler] 08:00 reminder failed:', err);
  }
}, {
  timezone: 'Asia/Shanghai'
});

// 每日00:00执行合规检查
cron.schedule('0 0 * * *', async () => {
  logger.info('[Scheduler] Running daily compliance check...');
  try {
    await complianceTask.checkYesterdayReports();
    logger.info('[Scheduler] Compliance check completed');
  } catch (err) {
    logger.error('[Scheduler] Compliance check failed:', err);
  }
}, {
  timezone: 'Asia/Shanghai'
});

// 每月1日00:00更新上月统计
cron.schedule('0 0 1 * *', async () => {
  logger.info('[Scheduler] Updating monthly stats...');
  try {
    await statsService.updateLastMonthStats();
    logger.info('[Scheduler] Monthly stats updated');
  } catch (err) {
    logger.error('[Scheduler] Stats update failed:', err);
  }
}, {
  timezone: 'Asia/Shanghai'
});

logger.info('[Scheduler] 所有定时任务已注册');

module.exports = { scheduler: null };
