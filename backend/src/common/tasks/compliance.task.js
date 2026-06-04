'use strict';

const db = require('../../common/config/database');
const complianceService = require('../../features/compliance/services/compliance.service');
const logger = require('../utils/logger');

/**
 * 检查昨天的日报合规性
 * 每天00:00执行,检查前一天所有出差员工的日报提交情况
 */
async function checkYesterdayReports() {
  logger.info('[ComplianceTask] 开始执行昨日日报合规检查...');
  
  try {
    // 计算昨天的日期
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD
    
    logger.info(`[ComplianceTask] 检查日期: ${yesterdayStr}`);
    
    // 1. 查询昨天所有处于active状态的出差员工
    const bizTripRows = await db.query(
      `SELECT bts.user_id, bts.project_name
       FROM biz_trip_status bts
       WHERE bts.status = 'active' AND bts.start_date <= ?`,
      [yesterdayStr]
    );
    
    if (!bizTripRows || bizTripRows.length === 0) {
      logger.info('[ComplianceTask] 昨天没有出差员工,跳过检查');
      return { checkedCount: 0, createdCount: 0 };
    }
    
    logger.info(`[ComplianceTask] 找到 ${bizTripRows.length} 个出差员工`);
    
    let createdCount = 0;
    
    // 2. 检查每个员工是否已提交昨天的日报
    for (const trip of bizTripRows) {
      try {
        // 查询是否已提交
        const reportRows = await db.query(
          'SELECT id, created_at FROM daily_reports WHERE user_id = ? AND report_date = ?',
          [trip.user_id, yesterdayStr]
        );
        
        if (reportRows && reportRows.length > 0) {
          // 已提交,检查及时性
          const report = reportRows[0];
          const timeliness = complianceService.checkTimeliness(yesterdayStr, report.created_at);
          
          // 如果还没有合规记录,则创建
          const [complianceRows] = await db.query(
            'SELECT id FROM report_compliance WHERE report_id = ?',
            [report.id]
          );
          
          if (!complianceRows || complianceRows.length === 0) {
            await complianceService.createComplianceRecord({
              reportId: report.id,
              userId: trip.user_id,
              reportDate: yesterdayStr,
              timeliness,
              submitTime: report.created_at
            });
            createdCount++;
            logger.info(`[ComplianceTask] 用户${trip.user_id}的日报已标记为${timeliness}`);
          }
        } else {
          // 未提交,创建缺失记录
          // 这里需要创建一个虚拟的report_id,或者在report_compliance中允许report_id为NULL
          // 简化处理:先不创建记录,等待用户实际提交时再检查
          logger.warn(`[ComplianceTask] 用户${trip.user_id}昨天未提交日报`);
        }
      } catch (err) {
        logger.error(`[ComplianceTask] 处理用户${trip.user_id}时出错:`, err.message);
      }
    }
    
    logger.info(`[ComplianceTask] 合规检查完成`, {
      date: yesterdayStr,
      checkedCount: bizTripRows.length,
      createdCount,
      timestamp: new Date().toISOString()
    });
    
    return { checkedCount: bizTripRows.length, createdCount };
  } catch (err) {
    logger.error('[ComplianceTask] 合规检查失败:', {
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
    throw err;
  }
}

module.exports = { checkYesterdayReports };
