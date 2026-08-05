'use strict';

const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * 答题模块定时任务 — 超时扫描
 */

/**
 * 扫描超时的进行中考试记录，置为 timeout
 * 1) 个人计时超时(server_time + duration)
 * 2) 考试窗口结束(end_time 到点强制交卷)
 * 每 5 分钟由 scheduler 调用
 * @returns {Promise<{affected: number}>}
 */
async function scanTimeoutExams() {
  const r1 = await db.execute(
    `UPDATE exam_records r
     JOIN exam_papers p ON r.paper_id = p.id
     SET r.status = 'timeout', r.end_time = NOW()
     WHERE r.status = 'doing'
       AND r.mode = 'exam'
       AND NOW() > DATE_ADD(r.server_time, INTERVAL p.duration MINUTE)`
  );
  const r2 = await db.execute(
    `UPDATE exam_records r
     JOIN exam_papers p ON r.paper_id = p.id
     SET r.status = 'timeout', r.end_time = NOW()
     WHERE r.status = 'doing' AND r.mode = 'exam'
       AND p.end_time IS NOT NULL AND NOW() > p.end_time`
  );
  const affected = ((r1 && r1[0] && r1[0].affectedRows) || 0) + ((r2 && r2[0] && r2[0].affectedRows) || 0);
  if (affected > 0) {
    logger.info('[Exam] 超时扫描: 置 timeout', { count: affected });
  }
  return { affected };
}

module.exports = { scanTimeoutExams };
