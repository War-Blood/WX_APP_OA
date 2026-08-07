'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 题库分类管理服务 — 分类树(含二级) + CRUD
 */

/**
 * 计算各分类下启用题目数(仅直属, 不含子孙)
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
 * 分类树列表(每个节点附子树聚合题量 questionNum)
 * @returns {Promise<Array>} 树形结构
 */
async function list() {
  const [rows, countMap] = await Promise.all([
    db.query(
      'SELECT id, parent_id, name, cover, question_num, time, path, sort_order, created_at FROM exam_categories ORDER BY sort_order ASC, id ASC'
    ),
    countQuestionsByCategory(),
  ]);
  const map = {};
  rows.forEach((r) => { map[r.id] = { ...r, children: [], questionNum: countMap[r.id] || 0 }; });
  const tree = [];
  rows.forEach((r) => {
    const node = map[r.id];
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children.push(node);
    } else {
      tree.push(node);
    }
  });
  // 子树题量聚合: 父级 questionNum = 自身 + 全部子孙
  const aggregate = (node) => {
    let total = node.questionNum;
    node.children.forEach((c) => { total += aggregate(c); });
    node.questionNum = total;
    return total;
  };
  tree.forEach(aggregate);
  return tree;
}

/**
 * 新增分类
 * @param {Object} data - { parentId, name, cover?, time?, sortOrder? }
 * @returns {Promise<Object>} { id }
 */
async function create(data) {
  if (!data.name) throw new ValidationError('分类名称不能为空');
  const parentId = data.parentId || 0;
  let path = data.name;
  if (parentId) {
    const [parent] = await db.query('SELECT path FROM exam_categories WHERE id = ?', [parentId]);
    if (!parent) throw new BusinessError('父分类不存在', null, ErrorCode.ANSWER_CATEGORY_NOT_FOUND);
    path = parent.path ? `${parent.path}/${data.name}` : data.name;
  }
  const result = await db.execute(
    'INSERT INTO exam_categories (parent_id, name, cover, time, path, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
    [parentId, data.name, data.cover || null, data.time != null ? data.time : 10, path, data.sortOrder || 0]
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
  let path = name;
  if (row.parent_id) {
    const [parent] = await db.query('SELECT path FROM exam_categories WHERE id = ?', [row.parent_id]);
    if (parent) path = parent.path ? `${parent.path}/${name}` : name;
  }
  await db.execute(
    'UPDATE exam_categories SET name = ?, cover = ?, time = ?, path = ?, sort_order = ? WHERE id = ?',
    [name, data.cover !== undefined ? data.cover : row.cover,
      data.time != null ? data.time : row.time,
      path, data.sortOrder !== undefined ? data.sortOrder : row.sort_order, id]
  );
  return { updated: true };
}

/**
 * 删除分类(有子分类或题目时拒绝)
 * @param {number} id - 分类ID
 * @returns {Promise<Object>} { deleted }
 */
async function remove(id) {
  const [row] = await db.query('SELECT id FROM exam_categories WHERE id = ?', [id]);
  if (!row) throw new BusinessError('分类不存在', null, ErrorCode.ANSWER_CATEGORY_NOT_FOUND);
  const [children] = await db.query('SELECT COUNT(*) AS cnt FROM exam_categories WHERE parent_id = ?', [id]);
  if (children.cnt > 0) {
    throw new BusinessError('请先删除子分类', null, ErrorCode.ANSWER_CATEGORY_HAS_QUESTIONS);
  }
  const [questions] = await db.query('SELECT COUNT(*) AS cnt FROM exam_questions WHERE category_id = ?', [id]);
  if (questions.cnt > 0) {
    throw new BusinessError('该分类下存在题目，请先移除题目', null, ErrorCode.ANSWER_CATEGORY_HAS_QUESTIONS);
  }
  await db.execute('DELETE FROM exam_categories WHERE id = ?', [id]);
  return { deleted: true };
}

module.exports = { list, create, update, remove };
