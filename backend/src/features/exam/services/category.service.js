'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');

/**
 * 题库分类管理服务
 */

async function list() {
  const rows = await db.query(
    'SELECT id, parent_id, name, path, sort_order, created_at FROM exam_categories ORDER BY sort_order ASC, id ASC'
  );
  // 组装树形结构
  const map = {};
  rows.forEach(r => { map[r.id] = { ...r, children: [] }; });
  const tree = [];
  rows.forEach(r => {
    const node = map[r.id];
    if (r.parent_id && map[r.parent_id]) {
      map[r.parent_id].children.push(node);
    } else {
      tree.push(node);
    }
  });
  return tree;
}

async function create(data) {
  if (!data.name) throw new ValidationError('分类名称不能为空');
  const parentId = data.parentId || 0;
  let path = data.name;
  if (parentId) {
    const [parent] = await db.query('SELECT path FROM exam_categories WHERE id = ?', [parentId]);
    if (!parent) throw new BusinessError('父分类不存在');
    path = parent.path ? `${parent.path}/${data.name}` : data.name;
  }
  const result = await db.execute(
    'INSERT INTO exam_categories (parent_id, name, path, sort_order) VALUES (?, ?, ?, ?)',
    [parentId, data.name, path, data.sortOrder || 0]
  );
  return { id: result[0].insertId };
}

async function update(id, data) {
  const [row] = await db.query('SELECT * FROM exam_categories WHERE id = ?', [id]);
  if (!row) throw new BusinessError('分类不存在');
  const name = data.name !== undefined ? data.name : row.name;
  // 重建 path
  let path = name;
  if (row.parent_id) {
    const [parent] = await db.query('SELECT path FROM exam_categories WHERE id = ?', [row.parent_id]);
    if (parent) path = parent.path ? `${parent.path}/${name}` : name;
  }
  await db.execute(
    'UPDATE exam_categories SET name = ?, path = ?, sort_order = ? WHERE id = ?',
    [name, path, data.sortOrder !== undefined ? data.sortOrder : row.sort_order, id]
  );
  return { updated: true };
}

async function remove(id) {
  const [row] = await db.query('SELECT id FROM exam_categories WHERE id = ?', [id]);
  if (!row) throw new BusinessError('分类不存在');
  // 有子分类拒绝
  const [children] = await db.query('SELECT COUNT(*) AS cnt FROM exam_categories WHERE parent_id = ?', [id]);
  if (children.cnt > 0) throw new BusinessError('请先删除子分类');
  // 有题目拒绝
  const [questions] = await db.query('SELECT COUNT(*) AS cnt FROM exam_questions WHERE category_id = ?', [id]);
  if (questions.cnt > 0) throw new BusinessError('该分类下存在题目，请先移除题目');
  await db.execute('DELETE FROM exam_categories WHERE id = ?', [id]);
  return { deleted: true };
}

module.exports = { list, create, update, remove };
