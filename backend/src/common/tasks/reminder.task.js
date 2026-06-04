'use strict';

const reminderService = require('../../features/compliance/services/reminder.service');
const logger = require('../utils/logger');

/**
 * 发送出差员工提醒任务
 * @param {string} timeSlot - '22:00' | '08:00'
 */
async function sendTripReminders(timeSlot) {
  logger.info(`[ReminderTask] 开始执行${timeSlot}提醒任务...`);
  
  try {
    const result = await reminderService.sendTripReminders(timeSlot);
    
    logger.info(`[ReminderTask] 提醒任务完成`, {
      timeSlot,
      sentCount: result.sentCount,
      totalCount: result.totalCount,
      timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (err) {
    logger.error(`[ReminderTask] ${timeSlot}提醒任务失败:`, {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    throw err;
  }
}

module.exports = { sendTripReminders };
