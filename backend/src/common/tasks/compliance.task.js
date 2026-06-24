'use strict';

const db = require('../../common/config/database');
const complianceService = require('../../features/compliance/services/compliance.service');
const logger = require('../utils/logger');

/**
 * 检查昨天的日报合规性
 * 每天00:00执行,按项目维度检查前一天日报提交情况
 *
 * 逻辑:
 * 1. 查询最近7天有日报的活动项目(去重)
 * 2. 对每个项目检查昨天是否提交了日报
 * 3. 已提交但无合规记录 → 创建合规记录
 * 4. 未提交 → 创建缺失记录(report_id=NULL)
 */
async function checkYesterdayReports() {
  logger.info('[ComplianceTask] 开始执行昨日日报合规检查...');

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    logger.info(`[ComplianceTask] 检查日期: ${yesterdayStr}`);

    // 查询最近7天有日报的活动项目
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sinceStr = sevenDaysAgo.toISOString().split('T')[0];

    const activeProjects = await db.query(
      `SELECT DISTINCT project, workers
       FROM daily_reports
       WHERE report_date >= ? AND report_date < ?
       ORDER BY project`,
      [sinceStr, yesterdayStr]
    );

    if (!activeProjects || activeProjects.length === 0) {
      logger.info('[ComplianceTask] 最近一周没有活动项目,跳过检查');
      return { checkedCount: 0, createdCount: 0 };
    }

    logger.info(`[ComplianceTask] 找到 ${activeProjects.length} 个活动项目`);

    let createdCount = 0;

    for (const item of activeProjects) {
      try {
        const project = item.project || '(未指定项目)';

        // 检查该项目昨天是否已提交日报
        const reportRows = await db.query(
          'SELECT id, created_at, workers FROM daily_reports WHERE project = ? AND report_date = ?',
          [project, yesterdayStr]
        );

        // 检查是否已有合规记录
        const [existingRows] = await db.query(
          'SELECT id FROM report_compliance WHERE project = ? AND report_date = ?',
          [project, yesterdayStr]
        );

        if (existingRows && existingRows.length > 0) {
          continue; // 已有合规记录,跳过
        }

        if (reportRows && reportRows.length > 0) {
          // 已提交日报,创建合规记录
          const report = reportRows[0];
          const timeliness = complianceService.checkTimeliness(yesterdayStr, report.created_at);

          await complianceService.createComplianceRecord({
            reportId: report.id,
            project,
            workers: report.workers || '',
            reportDate: yesterdayStr,
            timeliness,
            submitTime: report.created_at
          });
          createdCount++;
          logger.info(`[ComplianceTask] 项目"${project}"日报已标记为${timeliness}`);
        } else {
          // 未提交,创建缺失记录
          await complianceService.createComplianceRecord({
            reportId: null,
            project,
            workers: item.workers || '',
            reportDate: yesterdayStr,
            timeliness: 'missing',
            submitTime: null
          });
          createdCount++;
          logger.warn(`[ComplianceTask] 项目"${project}"昨天未提交日报,已创建缺失记录`);
        }
      } catch (err) {
        logger.error(`[ComplianceTask] 处理项目"${item.project}"时出错:`, err.message);
      }
    }

    logger.info(`[ComplianceTask] 合规检查完成`, {
      date: yesterdayStr,
      checkedCount: activeProjects.length,
      createdCount,
      timestamp: new Date().toISOString()
    });

    return { checkedCount: activeProjects.length, createdCount };
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
