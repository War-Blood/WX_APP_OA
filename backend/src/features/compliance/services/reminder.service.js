'use strict';

const db = require('../../../common/config/database');
const coreStatsService = require('../../../core/services/stats.service');
const templateService = require('../../../system/wechat/template.service');
const logger = require('../../../common/utils/logger');

/**
 * 发送出差员工未提交提醒
 * 数据源：getDailyStatus（与公出统计页面一致）
 * 通知方式：messages 站内消息 + 微信模板消息（如 openid 可用）
 *
 * @param {string} timeSlot - '23:00' | '08:00'
 * @returns {Promise<Object>} 发送结果统计
 */
async function sendTripReminders(timeSlot) {
  try {
    // 1. 调用公出统计接口获取当日全员状态
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    logger.info(`[Reminder] 获取 ${dateStr} 公出统计状态...`);
    const dailyStatus = await coreStatsService.getDailyStatus(dateStr);

    if (!dailyStatus || !dailyStatus.workers) {
      logger.info('[Reminder] 未获取到人员数据');
      return { sentCount: 0, missingCount: 0, totalCount: 0 };
    }

    // 2. 筛选未提交人员
    const missingWorkers = dailyStatus.workers.filter(w => w.status === 'missing');
    const totalWorkers = dailyStatus.workers.length;

    if (missingWorkers.length === 0) {
      logger.info(`[Reminder] ${dateStr} 全员已提交，无需提醒 (${totalWorkers}人)`);
      return { sentCount: 0, missingCount: 0, totalCount: totalWorkers };
    }

    logger.info(`[Reminder] ${dateStr} 未提交 ${missingWorkers.length}/${totalWorkers} 人，开始发送提醒...`);

    let sentCount = 0;

    // 3. 逐个发送提醒（优先微信订阅消息，失败回退站内消息）
    for (const worker of missingWorkers) {
      try {
        const title = '📋 公出日志待填写';
        const description = `您今日(${dateStr})的公出日志尚未提交`;
        const deadlineText = timeSlot === '23:00'
          ? '请尽快在今日24:00前提交公出日志，避免影响合规统计。'
          : '请在今日08:00前补交昨日公出日志。';

        // 优先尝试微信订阅消息
        const wxResult = await templateService.sendSubscribeMessage(worker.userId, {
          time: `${dateStr} 23:00`,
          tip: description,
          status: '未提交'
        });

        if (wxResult.success) {
          logger.info(`[Reminder] 📱微信订阅消息已发送: ${worker.userName}(${worker.userId})`);
        } else {
          // 微信发送失败 → 写站内消息
          await db.execute(
            `INSERT INTO messages (receiver_id, type, title, description, content, is_read, created_at)
             VALUES (?, 'report', ?, ?, ?, 0, NOW())`,
            [worker.userId, title, description, deadlineText]
          );
          logger.info(`[Reminder] 📬站内消息已发送: ${worker.userName}(${worker.userId}) (微信:${wxResult.reason})`);
        }
        sentCount++;
      } catch (err) {
        logger.error(`[Reminder] ❌ 发送失败 ${worker.userId}: ${err.message}`);
      }
    }

    logger.info(`[Reminder] 完成: ${sentCount}/${missingWorkers.length} 条消息已发送 (共${totalWorkers}人在职)`);
    return { sentCount, missingCount: missingWorkers.length, totalCount: totalWorkers };

  } catch (err) {
    logger.error('[Reminder] 提醒任务执行失败:', err);
    throw err;
  }
}

module.exports = { sendTripReminders };
