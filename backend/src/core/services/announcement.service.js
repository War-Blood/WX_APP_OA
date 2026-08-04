'use strict';

const db = require('../../common/config/database');
const { NotFoundError, BusinessError } = require('../../common/utils/errors');

const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const STATUSES = ['draft', 'published', 'cancelled'];

async function list({ page = 1, pageSize = 20, keyword, status, priority }) {
  const conditions = ['a.deleted_at IS NULL'];
  const params = [];

  if (keyword) {
    conditions.push('(a.title LIKE ? OR a.content LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }
  if (status) {
    conditions.push('a.status = ?');
    params.push(status);
  }
  if (priority) {
    conditions.push('a.priority = ?');
    params.push(priority);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const offset = (page - 1) * pageSize;

  const countRows = await db.query(
    `SELECT COUNT(*) AS total
     FROM announcements a
     ${where}`,
    params
  );
  const rows = await db.query(
    `SELECT a.id, a.title, a.content, a.author_id, a.priority, a.target_departments,
            a.status, a.published_at, a.created_at, a.updated_at,
            u.nickname AS authorName, u.user_name AS authorUserName
     FROM announcements a
     LEFT JOIN users u ON a.author_id = u.id
     ${where}
     ORDER BY a.published_at DESC, a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parseInt(pageSize), offset]
  );

  return {
    list: rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      authorId: row.author_id,
      authorName: row.authorName || row.authorUserName || '',
      priority: row.priority,
      targetDepartments: row.target_departments ? JSON.parse(row.target_departments) : null,
      status: row.status,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    total: countRows[0].total,
    page: parseInt(page),
    pageSize: parseInt(pageSize),
    totalPages: Math.ceil(countRows[0].total / parseInt(pageSize)) || 0,
  };
}

async function create({ title, content, priority, targetDepartments, authorId }) {
  if (!title || !title.trim()) throw new BusinessError('公告标题不能为空');
  if (!content || !content.trim()) throw new BusinessError('公告内容不能为空');
  const finalPriority = PRIORITIES.includes(priority) ? priority : 'normal';
  const result = await db.execute(
    `INSERT INTO announcements (title, content, author_id, priority, target_departments, status)
     VALUES (?, ?, ?, ?, ?, 'draft')`,
    [title.trim(), content, authorId, finalPriority, targetDepartments ? JSON.stringify(targetDepartments) : null]
  );
  return { id: result[0].insertId };
}

async function update({ id, title, content, priority, targetDepartments }) {
  const rows = await db.query('SELECT id FROM announcements WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!rows.length) throw new NotFoundError('公告不存在');

  const updates = [];
  const params = [];
  if (title !== undefined) {
    if (!title.trim()) throw new BusinessError('公告标题不能为空');
    updates.push('title = ?');
    params.push(title.trim());
  }
  if (content !== undefined) {
    if (!content.trim()) throw new BusinessError('公告内容不能为空');
    updates.push('content = ?');
    params.push(content);
  }
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) throw new BusinessError('优先级无效');
    updates.push('priority = ?');
    params.push(priority);
  }
  if (targetDepartments !== undefined) {
    updates.push('target_departments = ?');
    params.push(targetDepartments ? JSON.stringify(targetDepartments) : null);
  }
  if (!updates.length) throw new BusinessError('没有需要更新的字段');

  params.push(id);
  await db.execute(`UPDATE announcements SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  return { id: Number(id) };
}

async function setStatus(id, status) {
  if (!STATUSES.includes(status)) throw new BusinessError('状态无效');
  const rows = await db.query('SELECT id FROM announcements WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!rows.length) throw new NotFoundError('公告不存在');

  if (status === 'published') {
    await db.execute(
      "UPDATE announcements SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = ?",
      [id]
    );
  } else {
    await db.execute(
      'UPDATE announcements SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );
  }
  return { id: Number(id), status };
}

async function remove(id) {
  const rows = await db.query('SELECT id FROM announcements WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!rows.length) throw new NotFoundError('公告不存在');
  await db.execute('UPDATE announcements SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?', [id]);
  return { id: Number(id), deleted: true };
}

module.exports = { list, create, update, setStatus, remove };
