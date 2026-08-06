'use strict';

const db = require('../../../common/config/database');
const { NotFoundError, BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 考试记录服务 — 个人/全员/统计/详情/导出
 */

async function myRecords(userId, { page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  const [{ total }] = await db.query(
    'SELECT COUNT(*) AS total FROM exam_records WHERE user_id = ?', [userId]
  );
  const rows = await db.query(
    `SELECT r.*, p.title AS paperTitle, p.result_visibility, p.result_released
     FROM exam_records r
     LEFT JOIN exam_papers p ON r.paper_id = p.id
     WHERE r.user_id = ?
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  return { list: rows.map(formatRow), total };
}

async function allRecords({ keyword, paperId, status, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (paperId) { conditions.push('r.paper_id = ?'); params.push(paperId); }
  if (status) { conditions.push('r.status = ?'); params.push(status); }
  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.user_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * pageSize;

  const [{ total }] = await db.query(
    `SELECT COUNT(*) AS total FROM exam_records r JOIN users u ON r.user_id = u.id ${where}`, params
  );
  const rows = await db.query(
    `SELECT r.*, p.title AS paperTitle, u.nickname AS userName, d.name AS departmentName
     FROM exam_records r
     LEFT JOIN exam_papers p ON r.paper_id = p.id
     JOIN users u ON r.user_id = u.id
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { list: rows.map(formatRow), total };
}

async function stats(paperId) {
  const [paper] = await db.query('SELECT title, total_score, pass_score FROM exam_papers WHERE id = ?', [paperId]);
  if (!paper) return null;

  const [summary] = await db.query(
    `SELECT COUNT(*) AS total, AVG(score) AS avgScore,
     SUM(CASE WHEN is_pass = 1 THEN 1 ELSE 0 END) AS passCount,
     SUM(CASE WHEN status = 'cheated' THEN 1 ELSE 0 END) AS cheatCount
     FROM exam_records WHERE paper_id = ? AND status IN ('submitted','cheated')`,
    [paperId]
  );

  const distribution = await db.query(
    `SELECT CASE
       WHEN score < 60 THEN '0-59'
       WHEN score < 80 THEN '60-79'
       ELSE '80-100'
     END AS \`range\`, COUNT(*) AS count
     FROM exam_records WHERE paper_id = ? AND status = 'submitted'
     GROUP BY \`range\` ORDER BY \`range\``,
    [paperId]
  );

  return {
    paperTitle: paper.title, totalScore: paper.total_score, passScore: paper.pass_score,
    total: summary.total, avgScore: Math.round(summary.avgScore || 0),
    passCount: summary.passCount, cheatCount: summary.cheatCount,
    passRate: summary.total ? Math.round(summary.passCount / summary.total * 100) : 0,
    distribution,
  };
}

function formatRow(r) {
  // 成绩展示控制: manual 且未公布 → 员工侧掩码(admin 端点不带这些字段,自然不过滤)
  const resultPending = r.result_visibility === 'manual' && !r.result_released;
  return {
    id: r.id, userId: r.user_id, paperId: r.paper_id,
    paperTitle: r.paperTitle || '', userName: r.userName || '', departmentName: r.departmentName || '',
    mode: r.mode,
    score: resultPending ? null : r.score,
    totalScore: r.total_score,
    isPass: resultPending ? null : r.is_pass,
    warnCount: r.warn_count,
    startTime: r.start_time, endTime: r.end_time, status: r.status,
    paperVersion: r.paper_version,
    resultPending,
  };
}

/**
 * 单条记录详情（含逐题判分明细，供结果页渲染）
 * 由 question_snapshot + answers 重新判分，与 submitExam 逻辑一致
 */
async function detail(recordId, userId) {
  const [record] = await db.query(
    `SELECT r.*, p.title AS paperTitle, p.pass_score AS passScore, p.result_visibility, p.result_released
     FROM exam_records r
     LEFT JOIN exam_papers p ON r.paper_id = p.id
     WHERE r.id = ? AND r.user_id = ?`,
    [recordId, userId]
  );
  if (!record) throw new NotFoundError('考试记录不存在');

  // 成绩展示控制: manual 且未公布 → 3008
  if (record.result_visibility === 'manual' && !record.result_released) {
    throw new BusinessError('成绩未公布,暂不可查看', null, ErrorCode.EXAM_RESULT_NOT_RELEASED);
  }

  const snapshot = typeof record.question_snapshot === 'string' ? JSON.parse(record.question_snapshot) : record.question_snapshot;
  const answers = typeof record.answers === 'string' ? JSON.parse(record.answers || '{}') : (record.answers || {});

  const details = snapshot.map(q => {
    const userAnswer = answers[String(q.id)] || '';
    let correct = false;
    let earnedPoints = 0;
    if (q.type === 'single' || q.type === 'judge') {
      correct = userAnswer === q.answer;
      earnedPoints = correct ? q.score : 0;
    } else if (q.type === 'multiple') {
      if (q.scoreMode === 'partial') {
        const userSet = new Set(userAnswer.split(','));
        const correctSet = new Set(q.answer.split(','));
        const hasError = [...userSet].some(k => !correctSet.has(k));
        if (!hasError) {
          const matchCount = [...userSet].filter(k => correctSet.has(k)).length;
          earnedPoints = Math.round(q.score * matchCount / correctSet.size);
          correct = matchCount === correctSet.size;
        }
      } else {
        const u = userAnswer.split(',').sort().join(',');
        const c = q.answer.split(',').sort().join(',');
        correct = u === c;
        earnedPoints = correct ? q.score : 0;
      }
    }
    return {
      questionId: q.id, type: q.type, title: q.title,
      options: q.options, userAnswer, rightAnswer: q.answer,
      analysis: q.analysis, correct, earnedPoints, totalPoints: q.score,
      section: q.section || null,
    };
  });

  return {
    recordId: record.id, paperId: record.paper_id, paperTitle: record.paperTitle || '',
    mode: record.mode, score: record.score, totalScore: record.total_score,
    isPass: record.is_pass, passScore: record.passScore,
    status: record.status, warnCount: record.warn_count,
    startTime: record.start_time, endTime: record.end_time,
    details,
  };
}

/** CSV 字段转义(逗号/引号/换行) */
function csvField(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * 导出考试成绩 CSV(utf-8 BOM,Excel 可直接打开)
 */
async function exportRecords({ paperId, keyword }) {
  const conditions = [];
  const params = [];
  if (paperId) { conditions.push('r.paper_id = ?'); params.push(paperId); }
  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.user_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  const rows = await db.query(
    `SELECT r.*, p.title AS paperTitle, u.nickname AS userName, d.name AS departmentName
     FROM exam_records r
     LEFT JOIN exam_papers p ON r.paper_id = p.id
     JOIN users u ON r.user_id = u.id
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     ${where} ORDER BY r.created_at DESC`,
    params
  );

  const statusMap = { doing: '进行中', submitted: '已提交', timeout: '已超时', cheated: '作弊' };
  const headers = ['姓名', '部门', '试卷', '分数', '用时(秒)', '状态', '交卷时间'];
  const lines = rows.map(r => {
    const elapsed = (r.start_time && r.end_time)
      ? Math.round((new Date(r.end_time) - new Date(r.start_time)) / 1000)
      : '';
    return [
      csvField(r.userName), csvField(r.departmentName), csvField(r.paperTitle),
      r.score != null ? r.score : '', elapsed,
      csvField(statusMap[r.status] || r.status), r.end_time || '',
    ].join(',');
  });
  const csv = '﻿' + [headers.join(','), ...lines].join('\n');
  return { filename: `exam-records-${new Date().toISOString().slice(0, 10)}.csv`, csv };
}

module.exports = { myRecords, allRecords, stats, detail, exportRecords };
