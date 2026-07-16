'use strict';

const db = require('../../../common/config/database');

/**
 * 考试记录服务 — 个人/全员/统计
 */

async function myRecords(userId, { page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  const [{ total }] = await db.query(
    'SELECT COUNT(*) AS total FROM exam_records WHERE user_id = ?', [userId]
  );
  const rows = await db.query(
    `SELECT r.*, p.title AS paperTitle FROM exam_records r
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
    `SELECT r.*, p.title AS paperTitle, u.nickname AS userName
     FROM exam_records r
     LEFT JOIN exam_papers p ON r.paper_id = p.id
     JOIN users u ON r.user_id = u.id
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
     END AS range, COUNT(*) AS count
     FROM exam_records WHERE paper_id = ? AND status = 'submitted'
     GROUP BY range ORDER BY range`,
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
  return {
    id: r.id, userId: r.user_id, paperId: r.paper_id,
    paperTitle: r.paperTitle || '', userName: r.userName || '',
    mode: r.mode, score: r.score, totalScore: r.total_score,
    isPass: r.is_pass, warnCount: r.warn_count,
    startTime: r.start_time, endTime: r.end_time, status: r.status,
    paperVersion: r.paper_version,
  };
}

module.exports = { myRecords, allRecords, stats };
