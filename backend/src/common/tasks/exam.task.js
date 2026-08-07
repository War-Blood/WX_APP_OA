'use strict';

const examService = require('../../features/exam/services/exam.service');

/**
 * 答题模块定时任务
 */

/**
 * 扫描超时未交卷的考试/模拟记录(每 5 分钟由 scheduler 调用)
 * @returns {Promise<number>} 超时记录数
 */
async function scanTimeoutExams() {
  return examService.scanTimeoutExams();
}

module.exports = { scanTimeoutExams };
