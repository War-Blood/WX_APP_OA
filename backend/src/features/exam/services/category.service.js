'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 题库分类管理服务 — 单层主分类(无子分类) + CRUD
 * v3 起分类体系正式扁平化: 全部为根分类, parent_id 恒为 0
 */

/**
 * 计算各分类下启用题目数
 * @returns {Promise<Object>} category_id → 数量
 */
async function countQuestionsByCategory() {
  const rows = await db.query(
    "SELECT category_id, COUNT(*) AS cnt FROM exam_questions WHERE status = 'active' GROUP BY category_id"
  );
  const map = {};
  rows.forEach((r) => { map[r.category_id] = r.cnt; });
  return map;
}

/**
 * 主分类列表(扁平, 无子分类)
 * @returns {Promise<Array>} [{ id, parentId, name, cover, questionNum, time, path, sortOrder }]
 */
async function list() {
  const [rows, countMap] = await Promise.all([
    db.query(
      'SELECT id, parent_id, name, cover, question_num, time, path, sort_order, created_at FROM exam_categories ORDER BY sort_order ASC, id ASC'
    ),
    countQuestionsByCategory(),
  ]);
  return rows.map((r) => ({
    id: r.id,
    parentId: r.parent_id || 0,
    name: r.name,
    cover: r.cover,
    questionNum: countMap[r.id] || 0,
    time: r.time,
    path: r.path || r.name,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }));
}

/**
 * 新增主分类(不支持子分类)
 * @param {Object} data - { name, cover?, time?, sortOrder? }
 * @returns {Promise<Object>} { id }
 */
async function create(data) {
  if (!data.name) throw new ValidationError('分类名称不能为空');
  const parentId = 0;
  const result = await db.execute(
    'INSERT INTO exam_categories (parent_id, name, cover, time, path, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [parentId, data.name, data.cover || null, data.time != null ? data.time : 10, data.name, data.sortOrder || 0]
  );
  return { id: result[0].insertId };
}

/**
 * 编辑分类
 * @param {number} id - 分类ID
 * @param {Object} data - { name?, cover?, time?, sortOrder? }
 * @returns {Promise<Object>} { updated }
 */
async function update(id, data) {
  const [row] = await db.query('SELECT * FROM exam_categories WHERE id = ?', [id]);
  if (!row) throw new BusinessError('分类不存在', null, ErrorCode.ANSWER_CATEGORY_NOT_FOUND);
  const name = data.name !== undefined ? data.name : row.name;
  await db.execute(
    'UPDATE exam_categories SET name = ?, cover = ?, time = ?, path = ?, sort_order = ? WHERE id = ?',
    [name, data.cover !== undefined ? data.cover : row.cover,
      data.time != null ? data.time : row.time,
      name, data.sortOrder !== undefined ? data.sortOrder : row.sort_order, id]
  );
  return { updated: true };
}

/**
 * 删除分类(有题目时拒绝; 无子分类概念)
 * @param {number} id - 分类ID
 * @returns {Promise<Object>} { deleted }
 */
async function remove(id) {
  const [row] = await db.query('SELECT id FROM exam_categories WHERE id = ?', [id]);
  if (!row) throw new BusinessError('分类不存在', null, ErrorCode.ANSWER_CATEGORY_NOT_FOUND);
  const [questions] = await db.query('SELECT COUNT(*) AS cnt FROM exam_questions WHERE category_id = ?', [id]);
  if (questions.cnt > 0) {
    throw new BusinessError('该分类下存在题目，请先移除题目', null, ErrorCode.ANSWER_CATEGORY_HAS_QUESTIONS);
  }
  await db.execute('DELETE FROM exam_categories WHERE id = ?', [id]);
  return { deleted: true };
}

module.exports = { list, create, update, remove };
