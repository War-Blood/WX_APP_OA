'use strict';

const db = require('../../../common/config/database');

/**
 * 错题本服务 — 列表/移除
 */

/**
 * 我的错题列表(分页)
 * @param {number} userId - 用户ID
 * @param {Object} opts - { page, pageSize }
 * @returns {Promise<Object>} { list, total }
 */
async function list(userId, { page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  const [{ total }] = await db.query(
    'SELECT COUNT(*) AS total FROM exam_wrong_questions WHERE user_id = ?', [userId]
  );
  const rows = await db.query(
    `SELECT w.id AS wrongId, w.question_id, w.wrong_count, w.last_wrong_at,
            q.type, q.title, q.options, q.answer, q.analysis, q.score
     FROM exam_wrong_questions w
     JOIN exam_questions q ON w.question_id = q.id
     WHERE w.user_id = ?
     ORDER BY w.last_wrong_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  return {
    list: rows.map((r) => ({
      wrongId: r.wrongId, questionId: r.question_id, wrongCount: r.wrong_count, lastWrongAt: r.last_wrong_at,
      type: r.type, title: r.title,
      options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
      answer: r.answer, analysis: r.analysis, score: r.score,
    })),
    total,
  };
}

/**
 * 移除错题
 * @param {number} userId - 用户ID
 * @param {number} questionId - 题目ID
 * @returns {Promise<Object>} { removed }
 */
async function remove(userId, questionId) {
  await db.execute(
    'DELETE FROM exam_wrong_questions WHERE user_id = ? AND question_id = ?',
    [userId, questionId]
  );
  return { removed: true };
}

module.exports = { list, remove };
