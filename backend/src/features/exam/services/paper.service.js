'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 试卷管理服务
 */

/** JSON 数组 → 存储字符串,空/未定义为 null */
function jsonOrNull(v) {
  return Array.isArray(v) && v.length ? JSON.stringify(v) : null;
}

/** 随机抽题规则 → 自动总分 Σ(count×score) */
function totalFromDrawRules(rules) {
  return (rules || []).reduce((sum, r) => sum + (Number(r.count) || 0) * (Number(r.score) || 0), 0);
}

/** 解析 JSON 字段(string|array → array) */
function parseArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return []; }
}

/**
 * 站内信发送(复用 messages 表,type='exam'),失败不影响主流程
 */
async function sendExamMessage(receiverId, title, description, content) {
  try {
    await db.execute(
      'INSERT INTO messages (receiver_id, type, title, description, content, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, NOW())',
      [receiverId, 'exam', title, description, content || '']
    );
  } catch (e) { /* 消息发送失败不影响主流程 */ }
}

/**
 * 解析试卷参加范围内全部用户 id(按 scope_type)
 */
async function getScopeUserIds(paper) {
  if (paper.scope_type === 'all') {
    const rows = await db.query("SELECT id FROM users WHERE status = 'active' OR status IS NULL");
    return rows.map(u => u.id);
  }
  if (paper.scope_type === 'department') {
    const deptIds = parseArr(paper.scope_departments);
    if (!deptIds.length) return [];
    const rows = await db.query(
      `SELECT id FROM users WHERE department_id IN (${deptIds.map(() => '?').join(',')})`, deptIds
    );
    return rows.map(u => u.id);
  }
  if (paper.scope_type === 'user') return parseArr(paper.scope_users);
  if (paper.scope_type === 'role') {
    const roles = parseArr(paper.scope_roles);
    if (!roles.length) return [];
    const rows = await db.query(
      `SELECT id FROM users WHERE role IN (${roles.map(() => '?').join(',')})`, roles
    );
    return rows.map(u => u.id);
  }
  return [];
}

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

  const drawRules = Array.isArray(data.drawRules) ? data.drawRules : [];
  if (drawRules.length) {
    if (Array.isArray(data.questionIds) && data.questionIds.length) {
      throw new ValidationError('随机抽题与手动选题不可同时使用');
    }
  } else if (!data.questionIds || !data.questionIds.length) {
    throw new ValidationError('请选择题目或配置随机抽题');
  }

  const totalScore = drawRules.length ? totalFromDrawRules(drawRules) : (data.totalScore || 100);

  const result = await db.execute(
    `INSERT INTO exam_papers (title, description, duration, pass_score, total_score,
     max_attempts, max_screenshot_warns, scope_type, scope_departments, scope_users, scope_roles,
     draw_rules, shuffle_questions, shuffle_options, sections, result_visibility,
     start_time, end_time, question_ids, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.title, data.description || '', data.duration || 60, data.passScore || 60,
     totalScore, data.maxAttempts ?? 1, data.maxScreenshotWarns ?? 2,
     data.scopeType || 'all',
     data.scopeType === 'department' ? jsonOrNull(data.scopeDepartments) : null,
     data.scopeType === 'user' ? jsonOrNull(data.scopeUsers) : null,
     data.scopeType === 'role' ? jsonOrNull(data.scopeRoles) : null,
     drawRules.length ? JSON.stringify(drawRules) : null,
     data.shuffleQuestions ? 1 : 0, data.shuffleOptions ? 1 : 0,
     Array.isArray(data.sections) && data.sections.length ? JSON.stringify(data.sections) : null,
     data.resultVisibility || 'immediate',
     data.startTime || null, data.endTime || null,
     JSON.stringify(data.questionIds || []), data.createdBy]
  );
  return { id: result[0].insertId };
}

async function update(id, data) {
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.EXAM_PAPER_NOT_FOUND);

  // 已发布试卷修改题目组成(手动选题或抽题规则) → 自动克隆新版本,旧卷归档
  if (paper.status === 'published' && (data.questionIds !== undefined || data.drawRules !== undefined)) {
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
  if (data.drawRules !== undefined) {
    const drawRules = Array.isArray(data.drawRules) ? data.drawRules : [];
    updates.push('draw_rules = ?'); params.push(drawRules.length ? JSON.stringify(drawRules) : null);
  }
  if (data.totalScore !== undefined) {
    updates.push('total_score = ?'); params.push(data.totalScore);
  } else if (Array.isArray(data.drawRules) && data.drawRules.length) {
    // drawRules 变更且未显式传总分 → 自动重算
    updates.push('total_score = ?'); params.push(totalFromDrawRules(data.drawRules));
  }
  if (data.maxAttempts !== undefined) { updates.push('max_attempts = ?'); params.push(data.maxAttempts); }
  if (data.maxScreenshotWarns !== undefined) { updates.push('max_screenshot_warns = ?'); params.push(data.maxScreenshotWarns); }
  if (data.scopeType !== undefined) { updates.push('scope_type = ?'); params.push(data.scopeType); }
  if (data.scopeDepartments !== undefined) { updates.push('scope_departments = ?'); params.push(jsonOrNull(data.scopeDepartments)); }
  if (data.scopeUsers !== undefined) { updates.push('scope_users = ?'); params.push(jsonOrNull(data.scopeUsers)); }
  if (data.scopeRoles !== undefined) { updates.push('scope_roles = ?'); params.push(jsonOrNull(data.scopeRoles)); }
  if (data.shuffleQuestions !== undefined) { updates.push('shuffle_questions = ?'); params.push(data.shuffleQuestions ? 1 : 0); }
  if (data.shuffleOptions !== undefined) { updates.push('shuffle_options = ?'); params.push(data.shuffleOptions ? 1 : 0); }
  if (data.sections !== undefined) { updates.push('sections = ?'); params.push(Array.isArray(data.sections) && data.sections.length ? JSON.stringify(data.sections) : null); }
  if (data.resultVisibility !== undefined) { updates.push('result_visibility = ?'); params.push(data.resultVisibility); }
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
  const drawRules = data.drawRules !== undefined
    ? (Array.isArray(data.drawRules) && data.drawRules.length ? JSON.stringify(data.drawRules) : null)
    : paper.draw_rules;
  const result = await db.execute(
    `INSERT INTO exam_papers (title, description, duration, pass_score, total_score,
     max_attempts, max_screenshot_warns, scope_type, scope_departments, scope_users, scope_roles,
     draw_rules, shuffle_questions, shuffle_options, sections, result_visibility,
     start_time, end_time, question_ids, status, version, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    [title, paper.description, paper.duration, paper.pass_score, paper.total_score,
     paper.max_attempts, paper.max_screenshot_warns, paper.scope_type, paper.scope_departments,
     paper.scope_users, paper.scope_roles,
     drawRules, paper.shuffle_questions, paper.shuffle_options, paper.sections, paper.result_visibility,
     paper.start_time, paper.end_time, questionIds, paper.version + 1, data.createdBy || paper.created_by]
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
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.EXAM_PAPER_NOT_FOUND);
  if (paper.status !== 'draft') throw new BusinessError('仅草稿状态可发布');
  await db.execute('UPDATE exam_papers SET status = ? WHERE id = ?', ['published', id]);

  // 发布通知范围内员工
  const userIds = await getScopeUserIds(paper);
  const windowText = [paper.start_time, paper.end_time].filter(Boolean).join(' 至 ') || '长期开放';
  for (const uid of userIds) {
    await sendExamMessage(uid, '新考试通知', `您有新的考试「${paper.title}」`,
      `考试「${paper.title}」已发布\n时长: ${paper.duration}分钟 · 合格线: ${paper.pass_score}分\n时间窗口: ${windowText}\n请及时参加考试。`);
  }
  return { published: true, notified: userIds.length };
}

async function releaseResult(id) {
  const [paper] = await db.query('SELECT id, result_visibility FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.EXAM_PAPER_NOT_FOUND);
  if (paper.result_visibility !== 'manual') throw new BusinessError('仅"公布后显示"成绩的试卷可公布');
  await db.execute('UPDATE exam_papers SET result_released = 1 WHERE id = ?', [id]);
  return { released: true };
}

async function remind(id) {
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.EXAM_PAPER_NOT_FOUND);
  if (paper.status !== 'published') throw new BusinessError('仅已发布试卷可催考');
  const userIds = await getScopeUserIds(paper);
  const doneRows = await db.query(
    "SELECT DISTINCT user_id FROM exam_records WHERE paper_id = ? AND status IN ('submitted','timeout','cheated')",
    [id]
  );
  const done = new Set(doneRows.map(r => r.user_id));
  const pending = userIds.filter(uid => !done.has(uid));
  for (const uid of pending) {
    await sendExamMessage(uid, '考试催办', `请尽快完成考试「${paper.title}」`,
      `考试「${paper.title}」尚未完成,请在截止前参加考试。\n时长: ${paper.duration}分钟 · 合格线: ${paper.pass_score}分`);
  }
  return { remindedCount: pending.length };
}

module.exports = { list, create, update, clone, remove, publish, releaseResult, remind };
