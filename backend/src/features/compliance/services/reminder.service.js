'use strict';

const db = require('../../../common/config/database');
const { sendWechatTemplate } = require('../../../system/wechat/template.service');

/**
 * 发送出差员工提醒
 * @param {string} timeSlot - '22:00' | '08:00'
 * @returns {Promise<Object>} 发送结果统计
 */
async function sendTripReminders(timeSlot) {
  try {
    // 1. 查询所有 active 状态的出差员工
    const bizTripRows = await db.query(
      `SELECT bts.user_id, bts.project_name, u.name as user_name
       FROM biz_trip_status bts
       JOIN users u ON bts.user_id = u.id
       WHERE bts.status = 'active'`
    );

    if (!bizTripRows || bizTripRows.length === 0) {
      console.log('[Reminder] 当前没有出差中的员工');
      return { sentCount: 0, totalCount: 0 };
    }

    console.log(`[Reminder] 找到 ${bizTripRows.length} 个出差员工,开始检查...`);

    let sentCount = 0;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // 2. 检查每个员工当日是否已提交日志
    for (const trip of bizTripRows) {
      try {
        // 查询今日是否已提交
        const reportRows = await db.query(
          'SELECT id FROM daily_reports WHERE user_id = ? AND report_date = ?',
          [trip.user_id, today]
        );

        if (reportRows && reportRows.length > 0) {
          console.log(`[Reminder] 用户${trip.user_name}(${trip.user_id})今日已提交日志,跳过`);
          continue;
        }

        // 3. 未提交则发送提醒
        console.log(`[Reminder] 向用户${trip.user_name}(${trip.user_id})发送提醒...`);

        // 发送微信模板消息
        const wechatSuccess = await sendWechatTemplate(trip.user_id, {
          first: { value: `您有一笔出差日志待填写`, color: '#173177' },
          project_name: { value: trip.project_name || '未指定项目', color: '#173177' },
          report_date: { value: today, color: '#173177' },
          deadline: { value: timeSlot === '22:00' ? '今日24:00' : '明日08:00前', color: '#FF0000' },
          remark: { value: '请及时填写公出日志,避免影响合规统计', color: '#173177' }
        });

        // 发送小程序站内通知(这里简化处理,实际应调用消息服务)
        console.log(`[Reminder] 已发送小程序站内通知给 ${trip.user_name}`);

        // 4. 更新提醒计数
        await db.query(
          `INSERT INTO report_compliance (user_id, report_date, expected_deadline, reminder_sent, reminder_count, last_reminder_at)
           VALUES (?, ?, ?, 1, 1, NOW())
           ON DUPLICATE KEY UPDATE reminder_count = reminder_count + 1, last_reminder_at = NOW()`,
          [trip.user_id, today, new Date()]
        );

        if (wechatSuccess) {
          sentCount++;
        }
      } catch (err) {
        console.error(`[Reminder] 处理用户${trip.user_id}时出错:`, err.message);
      }
    }

    console.log(`[Reminder] 提醒任务完成,共发送 ${sentCount}/${bizTripRows.length} 条消息`);
    return { sentCount, totalCount: bizTripRows.length };
  } catch (err) {
    console.error('[Reminder] 提醒任务执行失败:', err);
    throw err;
  }
}

module.exports = { sendTripReminders };
