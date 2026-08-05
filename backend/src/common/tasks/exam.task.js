'use strict';

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * 答题模块定时任务 — 超时扫描
 */

/**
 * 扫描超时的进行中考试记录，置为 timeout
 * 每 5 分钟由 scheduler 调用
 * @returns {Promise<{affected: number}>}
 */
async function scanTimeoutExams() {
  const result = await db.execute(
    `UPDATE exam_records r
     JOIN exam_papers p ON r.paper_id = p.id
     SET r.status = 'timeout', r.end_time = NOW()
     WHERE r.status = 'doing'
       AND r.mode = 'exam'
       AND NOW() > DATE_ADD(r.server_time, INTERVAL p.duration MINUTE)`
  );
  const affected = (result && result[0] && result[0].affectedRows) || 0;
  if (affected > 0) {
    logger.info('[Exam] 超时扫描: 置 timeout', { count: affected });
  }
  return { affected };
}

module.exports = { scanTimeoutExams };
