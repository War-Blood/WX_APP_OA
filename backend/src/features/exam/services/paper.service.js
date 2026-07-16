'use strict';

const db = require('../../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../../common/utils/errors');
const { ErrorCode } = require('../../../../common/utils/constants');

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
     max_attempts, max_screenshot_warns, scope_type, scope_departments, question_ids, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.description || '', data.duration || 60, data.passScore || 60,
     data.totalScore || 100, data.maxAttempts ?? 1, data.maxScreenshotWarns ?? 2,
     data.scopeType || 'all', data.scopeType === 'department' ? JSON.stringify(data.scopeDepartments) : null,
     JSON.stringify(data.questionIds), data.createdBy]
  );
  return { id: result[0].insertId };
}

async function update(id, data) {
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.EXAM_PAPER_NOT_FOUND);

  // 已发布试卷不可修改题目
  if (paper.status === 'published' && data.questionIds) {
    throw new BusinessError('已发布试卷不可编辑题目，请克隆新版本', null, ErrorCode.EXAM_PUBLISHED_READONLY);
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
  if (data.questionIds !== undefined) { updates.push('question_ids = ?'); params.push(JSON.stringify(data.questionIds)); }

  if (!updates.length) throw new ValidationError('无更新字段');
  params.push(id);
  await db.execute(`UPDATE exam_papers SET ${updates.join(', ')} WHERE id = ?`, params);
  return { updated: true };
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

module.exports = { list, create, update, remove, publish };
