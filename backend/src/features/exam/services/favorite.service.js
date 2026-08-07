'use strict';

const db = require('../../../common/config/database');

/**
 * 收藏服务 — 切换/列表
 */

/**
 * 收藏/取消收藏
 * @param {number} userId - 用户ID
 * @param {number} questionId - 题目ID
 * @returns {Promise<Object>} { favorited }
 */
async function toggle(userId, questionId) {
  const [existing] = await db.query(
    'SELECT id FROM exam_favorites WHERE user_id = ? AND question_id = ?',
    [userId, questionId]
  );
  if (existing) {
    await db.execute('DELETE FROM exam_favorites WHERE id = ?', [existing.id]);
    return { favorited: false };
  }
  await db.execute(
    'INSERT INTO exam_favorites (user_id, question_id) VALUES (?, ?)',
    [userId, questionId]
  );
  return { favorited: true };
}

/**
 * 我的收藏列表(分页)
 * @param {number} userId - 用户ID
 * @param {Object} opts - { page, pageSize }
 * @returns {Promise<Object>} { list, total }
 */
async function list(userId, { page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  const [{ total }] = await db.query(
    'SELECT COUNT(*) AS total FROM exam_favorites WHERE user_id = ?', [userId]
  );
  const rows = await db.query(
    `SELECT f.id AS favoriteId, f.question_id, f.created_at,
            q.type, q.title, q.options, q.answer, q.analysis, q.score
     FROM exam_favorites f
     JOIN exam_questions q ON f.question_id = q.id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  return {
    list: rows.map((r) => ({
      favoriteId: r.favoriteId, questionId: r.question_id, createdAt: r.created_at,
      type: r.type, title: r.title,
      options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
      answer: r.answer, analysis: r.analysis, score: r.score,
    })),
    total,
  };
}

module.exports = { toggle, list };
