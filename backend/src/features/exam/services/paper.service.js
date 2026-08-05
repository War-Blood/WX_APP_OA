'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 试卷管理服务
 */

async function list({ status, page = 1, pageSize = 20 }) {
  const conditions = [];
  const params = [];
  if (status) { conditions.push('status = ?'); params.push(status); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * pageSize;

  const [{ total }] = await db.query(`SELECT COUNT(*) AS total FROM exam_papers ${where}`, params);
  const rows = await db.query(
    `SELECT * FROM exam_papers ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { list: rows, total };
}

async function create(data) {
  if (!data.title) throw new ValidationError('试卷名称不能为空');
  if (!data.questionIds || !data.questionIds.length) throw new ValidationError('请选择题目');

  const result = await db.execute(
    `INSERT INTO exam_papers (title, description, duration, pass_score, total_score,
     max_attempts, max_screenshot_warns, scope_type, scope_departments, start_time, end_time, question_ids, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.description || '', data.duration || 60, data.passScore || 60,
     data.totalScore || 100, data.maxAttempts ?? 1, data.maxScreenshotWarns ?? 2,
     data.scopeType || 'all', data.scopeType === 'department' ? JSON.stringify(data.scopeDepartments) : null,
     data.startTime || null, data.endTime || null,
     JSON.stringify(data.questionIds), data.createdBy]
  );
  return { id: result[0].insertId };
}

async function update(id, data) {
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.EXAM_PAPER_NOT_FOUND);

  // 已发布试卷修改题目 → 自动克隆新版本，旧卷归档
  if (paper.status === 'published' && data.questionIds) {
    await db.execute("UPDATE exam_papers SET status = 'archived' WHERE id = ?", [id]);
    const result = await clone(id, data);
    return { cloned: true, id: result.id, version: result.version, message: '已发布试卷已自动克隆为新版本' };
  }

  const updates = [];
  const params = [];
  if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
  if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
  if (data.duration !== undefined) { updates.push('duration = ?'); params.push(data.duration); }
  if (data.passScore !== undefined) { updates.push('pass_score = ?'); params.push(data.passScore); }
  if (data.totalScore !== undefined) { updates.push('total_score = ?'); params.push(data.totalScore); }
  if (data.maxAttempts !== undefined) { updates.push('max_attempts = ?'); params.push(data.maxAttempts); }
  if (data.maxScreenshotWarns !== undefined) { updates.push('max_screenshot_warns = ?'); params.push(data.maxScreenshotWarns); }
  if (data.scopeType !== undefined) { updates.push('scope_type = ?'); params.push(data.scopeType); }
  if (data.scopeDepartments !== undefined) { updates.push('scope_departments = ?'); params.push(JSON.stringify(data.scopeDepartments)); }
  if (data.startTime !== undefined) { updates.push('start_time = ?'); params.push(data.startTime || null); }
  if (data.endTime !== undefined) { updates.push('end_time = ?'); params.push(data.endTime || null); }
  if (data.questionIds !== undefined) { updates.push('question_ids = ?'); params.push(JSON.stringify(data.questionIds)); }

  if (!updates.length) throw new ValidationError('无更新字段');
  params.push(id);
  await db.execute(`UPDATE exam_papers SET ${updates.join(', ')} WHERE id = ?`, params);
  return { updated: true };
}

async function clone(id, data = {}) {
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.EXAM_PAPER_NOT_FOUND);
  const title = data.title || paper.title;
  const questionIds = data.questionIds !== undefined
    ? JSON.stringify(data.questionIds)
    : paper.question_ids;
  const result = await db.execute(
    `INSERT INTO exam_papers (title, description, duration, pass_score, total_score,
     max_attempts, max_screenshot_warns, scope_type, scope_departments, start_time, end_time, question_ids, status, version, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [title, paper.description, paper.duration, paper.pass_score, paper.total_score,
     paper.max_attempts, paper.max_screenshot_warns, paper.scope_type, paper.scope_departments,
     paper.start_time, paper.end_time,
     questionIds, paper.version + 1, data.createdBy || paper.created_by]
  );
  return { id: result[0].insertId, version: paper.version + 1 };
}

async function remove(id) {
  const [paper] = await db.query('SELECT id FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.EXAM_PAPER_NOT_FOUND);
  await db.execute('DELETE FROM exam_papers WHERE id = ?', [id]);
  return { deleted: true };
}

async function publish(id) {
  const [paper] = await db.query('SELECT id, status FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.EXAM_PAPER_NOT_FOUND);
  if (paper.status !== 'draft') throw new BusinessError('仅草稿状态可发布');
  await db.execute('UPDATE exam_papers SET status = ? WHERE id = ?', ['published', id]);
  return { published: true };
}

module.exports = { list, create, update, clone, remove, publish };
