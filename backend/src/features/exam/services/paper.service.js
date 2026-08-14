'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 试卷管理服务 — 组卷/发放范围/次数/窗口（企业内部考核 P0）
 */

/** JSON 数组 → 存储字符串, 空/未定义为 null */
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
  try { return JSON.parse(v); } catch (e) { return []; }
}

/**
 * 校验用户是否在试卷发放范围内
 * @param {number} userId - 用户ID
 * @param {Object} paper - 试卷记录
 * @returns {Promise<boolean>}
 */
async function checkScope(userId, paper) {
  if (paper.scope_type === 'all') return true;
  const [user] = await db.query('SELECT department_id, role FROM users WHERE id = ?', [userId]);
  if (!user) return false;
  if (paper.scope_type === 'department') {
    return parseArr(paper.scope_departments).includes(user.department_id);
  }
  if (paper.scope_type === 'user') {
    return parseArr(paper.scope_users).includes(userId);
  }
  if (paper.scope_type === 'role') {
    return parseArr(paper.scope_roles).includes(user.role);
  }
  return true;
}

/**
 * 试卷列表(管理员)
 * @param {Object} opts - { status?, page?, pageSize? }
 * @returns {Promise<Object>} { list, total }
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

/**
 * 用户可参加的试卷列表(已发布 + 窗口内 + 范围匹配), 附本人考试状态
 * @param {number} userId - 用户ID
 * @returns {Promise<Array>} 试卷列表
 */
async function available(userId) {
  const papers = await db.query(
    `SELECT * FROM exam_papers
     WHERE status = 'published'
       AND (start_time IS NULL OR start_time <= NOW())
       AND (end_time IS NULL OR end_time > NOW())
     ORDER BY created_at DESC`
  );

  const result = [];
  for (const p of papers) {
    if (!(await checkScope(userId, p))) continue;
    const [latest] = await db.query(
      "SELECT * FROM exam_records WHERE user_id = ? AND paper_id = ? AND mode = 'exam' ORDER BY id DESC LIMIT 1",
      [userId, p.id]
    );
    const [attemptRow] = await db.query(
      "SELECT COUNT(*) AS cnt FROM exam_records WHERE user_id = ? AND paper_id = ? AND status IN ('submitted','timeout')",
      [userId, p.id]
    );
    result.push({
      paperId: p.id, title: p.title, description: p.description,
      duration: p.duration, passScore: p.pass_score, totalScore: p.total_score,
      maxAttempts: p.max_attempts, startTime: p.start_time, endTime: p.end_time,
      attemptsUsed: attemptRow.cnt,
      attemptsLimit: p.max_attempts,
      canTake: p.max_attempts === 0 || attemptRow.cnt < p.max_attempts,
      recordId: latest ? latest.id : null,
      myStatus: latest ? latest.status : null,
      myScore: latest ? latest.score : null,
      myPass: latest && latest.score != null ? (latest.score >= p.pass_score ? 1 : 0) : null,
    });
  }
  return result;
}

/**
 * 新建试卷
 * @param {Object} data - 组卷参数
 * @returns {Promise<Object>} { id }
 */
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
     max_attempts, scope_type, scope_departments, scope_users, scope_roles,
     draw_rules, shuffle_questions, shuffle_options, question_ids,
     start_time, end_time, status, version, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?)`,
    [data.title, data.description || '', data.duration || 60, data.passScore || 60,
      totalScore, data.maxAttempts ?? 1, data.scopeType || 'all',
      data.scopeType === 'department' ? jsonOrNull(data.scopeDepartments) : null,
      data.scopeType === 'user' ? jsonOrNull(data.scopeUsers) : null,
      data.scopeType === 'role' ? jsonOrNull(data.scopeRoles) : null,
      drawRules.length ? JSON.stringify(drawRules) : null,
      data.shuffleQuestions ? 1 : 0, data.shuffleOptions ? 1 : 0,
      JSON.stringify(data.questionIds || []),
      data.startTime || null, data.endTime || null, data.createdBy || null]
  );
  return { id: result[0].insertId };
}

/**
 * 编辑试卷(已发布修改题目组成 → 拒绝, 提示克隆)
 * @param {number} id - 试卷ID
 * @param {Object} data - 可更新字段
 * @returns {Promise<Object>} { updated }
 */
async function update(id, data) {
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.ANSWER_PAPER_NOT_FOUND);
  if (paper.status === 'published' && (data.questionIds !== undefined || data.drawRules !== undefined)) {
    throw new BusinessError('已发布试卷不可修改题目组成, 请删除后重建或下线', null, ErrorCode.ANSWER_PAPER_NOT_PUBLISHED);
  }

  const updates = [];
  const params = [];
  if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
  if (data.description !== undefined) { updates.push('description = ?'); params.push(data.description); }
  if (data.duration !== undefined) { updates.push('duration = ?'); params.push(data.duration); }
  if (data.passScore !== undefined) { updates.push('pass_score = ?'); params.push(data.passScore); }
  if (data.totalScore !== undefined) { updates.push('total_score = ?'); params.push(data.totalScore); }
  if (data.maxAttempts !== undefined) { updates.push('max_attempts = ?'); params.push(data.maxAttempts); }
  if (data.scopeType !== undefined) { updates.push('scope_type = ?'); params.push(data.scopeType); }
  if (data.scopeDepartments !== undefined) { updates.push('scope_departments = ?'); params.push(jsonOrNull(data.scopeDepartments)); }
  if (data.scopeUsers !== undefined) { updates.push('scope_users = ?'); params.push(jsonOrNull(data.scopeUsers)); }
  if (data.scopeRoles !== undefined) { updates.push('scope_roles = ?'); params.push(jsonOrNull(data.scopeRoles)); }
  if (data.drawRules !== undefined) { updates.push('draw_rules = ?'); params.push(Array.isArray(data.drawRules) && data.drawRules.length ? JSON.stringify(data.drawRules) : null); }
  if (data.shuffleQuestions !== undefined) { updates.push('shuffle_questions = ?'); params.push(data.shuffleQuestions ? 1 : 0); }
  if (data.shuffleOptions !== undefined) { updates.push('shuffle_options = ?'); params.push(data.shuffleOptions ? 1 : 0); }
  if (data.questionIds !== undefined) { updates.push('question_ids = ?'); params.push(JSON.stringify(data.questionIds)); }
  if (data.startTime !== undefined) { updates.push('start_time = ?'); params.push(data.startTime || null); }
  if (data.endTime !== undefined) { updates.push('end_time = ?'); params.push(data.endTime || null); }

  if (!updates.length) throw new ValidationError('无更新字段');
  params.push(id);
  await db.execute(`UPDATE exam_papers SET ${updates.join(', ')} WHERE id = ?`, params);
  return { updated: true };
}

/**
 * 删除试卷
 * @param {number} id - 试卷ID
 * @returns {Promise<Object>} { deleted }
 */
async function remove(id) {
  const [paper] = await db.query('SELECT status FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.ANSWER_PAPER_NOT_FOUND);
  if (paper.status === 'published') {
    throw new BusinessError('已发布试卷不可删除, 请先归档', null, ErrorCode.ANSWER_PAPER_NOT_PUBLISHED);
  }
  await db.execute('DELETE FROM exam_papers WHERE id = ?', [id]);
  return { deleted: true };
}

/**
 * 发布试卷
 * @param {number} id - 试卷ID
 * @returns {Promise<Object>} { published }
 */
async function publish(id) {
  const [paper] = await db.query('SELECT status FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.ANSWER_PAPER_NOT_FOUND);
  if (paper.status !== 'draft') throw new BusinessError('仅草稿状态可发布');
  await db.execute("UPDATE exam_papers SET status = 'published' WHERE id = ?", [id]);
  return { published: true };
}

/**
 * 归档已发布试卷(不可恢复为发布态, 仅保留成绩数据)
 * @param {number} id - 试卷ID
 * @returns {Promise<Object>} { archived }
 */
async function archive(id) {
  const [paper] = await db.query('SELECT status FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.ANSWER_PAPER_NOT_FOUND);
  if (paper.status !== 'published') throw new BusinessError('仅已发布试卷可归档');
  await db.execute("UPDATE exam_papers SET status = 'archived' WHERE id = ?", [id]);
  return { archived: true };
}

/**
 * 克隆试卷为新草稿(标题加 副本, 版本重置)
 * @param {number} id - 原试卷ID
 * @returns {Promise<Object>} { id }
 */
async function clone(id) {
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.ANSWER_PAPER_NOT_FOUND);
  const result = await db.execute(
    `INSERT INTO exam_papers (title, description, duration, pass_score, total_score,
     max_attempts, scope_type, scope_departments, scope_users, scope_roles,
     draw_rules, shuffle_questions, shuffle_options, question_ids,
     start_time, end_time, status, version, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?)`,
    [paper.title + '（副本）', paper.description, paper.duration, paper.pass_score, paper.total_score,
      paper.max_attempts, paper.scope_type, paper.scope_departments, paper.scope_users, paper.scope_roles,
      paper.draw_rules, paper.shuffle_questions, paper.shuffle_options, paper.question_ids,
      paper.start_time, paper.end_time, paper.created_by]
  );
  return { id: result[0].insertId };
}

/**
 * 试卷详情(供管理端只读预览): 随机抽题返回规则, 手动选题返回题目
 * @param {number} id - 试卷ID
 * @returns {Promise<Object>} { paper, questions, ruleSummary }
 */
async function detail(id) {
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [id]);
  if (!paper) throw new BusinessError('试卷不存在', null, ErrorCode.ANSWER_PAPER_NOT_FOUND);
  const drawRules = parseArr(paper.draw_rules);
  let questions = [];
  let ruleSummary = [];
  if (drawRules.length) {
    ruleSummary = drawRules.map((r2) => ({
      type: r2.type, categoryId: r2.categoryId || 0, count: r2.count, score: r2.score,
    }));
  } else {
    const ids = parseArr(paper.question_ids);
    if (ids.length) {
      questions = await db.query(
        'SELECT id, type, title, score FROM exam_questions WHERE id IN (' + ids.map(() => '?').join(',') + ')',
        ids
      );
    }
  }
  return { paper, questions, ruleSummary };
}

module.exports = { list, available, checkScope, create, update, remove, publish, archive, clone, detail };