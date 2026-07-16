'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 题库管理服务
 */

async function list({ categoryId, type, keyword, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (categoryId) { conditions.push('category_id = ?'); params.push(categoryId); }
  if (type) { conditions.push('type = ?'); params.push(type); }
  if (keyword) { conditions.push('title LIKE ?'); params.push(`%${keyword}%`); }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * pageSize;

  const [{ total }] = await db.query(`SELECT COUNT(*) AS total FROM exam_questions ${where}`, params);
  const rows = await db.query(
    `SELECT * FROM exam_questions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { list: rows, total };
}

async function create(data) {
  if (!data.title) throw new ValidationError('题干不能为空');
  if (!data.options || !Array.isArray(data.options) || data.options.length < 2) {
    throw new ValidationError('至少需要2个选项');
  }
  if (!data.answer) throw new ValidationError('正确答案不能为空');

  const result = await db.execute(
    `INSERT INTO exam_questions (category_id, type, title, options, answer, analysis, score, score_mode, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [data.categoryId || null, data.type || 'single', data.title, JSON.stringify(data.options),
     data.answer, data.analysis || null, data.score || 2, data.scoreMode || 'exact', data.createdBy]
  );
  return { id: result[0].insertId };
}

async function update(id, data) {
  const [row] = await db.query('SELECT id FROM exam_questions WHERE id = ?', [id]);
  if (!row) throw new BusinessError('题目不存在', null, ErrorCode.EXAM_QUESTION_NOT_FOUND);

  const updates = [];
  const params = [];
  if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
  if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
  if (data.options !== undefined) { updates.push('options = ?'); params.push(JSON.stringify(data.options)); }
  if (data.answer !== undefined) { updates.push('answer = ?'); params.push(data.answer); }
  if (data.analysis !== undefined) { updates.push('analysis = ?'); params.push(data.analysis); }
  if (data.score !== undefined) { updates.push('score = ?'); params.push(data.score); }
  if (data.scoreMode !== undefined) { updates.push('score_mode = ?'); params.push(data.scoreMode); }
  if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId); }
  if (data.status !== undefined) { updates.push('status = ?'); params.push(data.status); }

  if (!updates.length) throw new ValidationError('无更新字段');
  params.push(id);
  await db.execute(`UPDATE exam_questions SET ${updates.join(', ')} WHERE id = ?`, params);
  return { updated: true };
}

async function remove(id) {
  const [row] = await db.query('SELECT id FROM exam_questions WHERE id = ?', [id]);
  if (!row) throw new BusinessError('题目不存在', null, ErrorCode.EXAM_QUESTION_NOT_FOUND);
  await db.execute('DELETE FROM exam_questions WHERE id = ?', [id]);
  return { deleted: true };
}

async function batchImport(questions, createdBy) {
  if (!Array.isArray(questions) || !questions.length) {
    throw new ValidationError('导入数据不能为空');
  }

  let success = 0;
  const errors = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    try {
      if (!q.title || !q.options || !q.answer) {
        throw new Error('必填字段缺失');
      }
      if (q.options.length < 2) throw new Error('至少需要2个选项');
      const validTypes = ['single', 'multiple', 'judge'];
      if (!validTypes.includes(q.type)) throw new Error(`题型字段无效: ${q.type}`);

      await db.execute(
        `INSERT INTO exam_questions (category_id, type, title, options, answer, analysis, score, score_mode, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.categoryId || null, q.type, q.title, JSON.stringify(q.options),
         q.answer, q.analysis || null, q.score || 2, q.scoreMode || 'exact', createdBy]
      );
      success++;
    } catch (e) {
      errors.push({ row: i + 1, reason: e.message });
    }
  }
  return { success, failed: errors.length, errors };
}

module.exports = { list, create, update, remove, batchImport };
