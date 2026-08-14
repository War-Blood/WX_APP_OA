'use strict';

const db = require('../../../common/config/database');
const { BusinessError, ValidationError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 题库管理服务 — 列表/创建/更新/删除/批量导入
 * v3 起分类体系扁平化: 题目必须归属某个主分类(根分类)
 */

const VALID_TYPES = ['single', 'multiple', 'judge'];
const VALID_SCORE_MODES = ['exact', 'partial'];
const BATCH_CHUNK = 200;

/**
 * 校验单题数据(create/update/batchImport 共用)
 * @param {Object} data - { type, title, options, answer, score?, scoreMode? }
 * @returns {Object} 规范化 { type, answer, score, scoreMode }
 */
function validateQuestion(data) {
  const type = data.type || 'single';
  if (!VALID_TYPES.includes(type)) throw new ValidationError('题型字段无效: ' + type);
  if (!data.title || !String(data.title).trim()) throw new ValidationError('题干不能为空');
  if (!Array.isArray(data.options) || data.options.length < 2) throw new ValidationError('至少需要2个选项');

  const answer = String(data.answer || '').replace(/\s+/g, '').toUpperCase();
  if (!answer) throw new ValidationError('正确答案不能为空');
  const keys = data.options.map((o) => String(o.key).trim()).filter(Boolean);
  const answerKeys = answer.split(',');
  if (type === 'multiple') {
    if (answerKeys.length < 2) throw new ValidationError('多选题答案至少2个选项');
  } else if (answerKeys.length !== 1) {
    throw new ValidationError('单选/判断题答案只能有1个选项');
  }
  if (answerKeys.some((k) => !keys.includes(k))) {
    throw new ValidationError('答案 "' + data.answer + '" 不在选项范围内');
  }

  const score = data.score == null ? 2 : Number(data.score);
  if (Number.isNaN(score) || score <= 0) throw new ValidationError('分值必须为正数');
  const scoreMode = data.scoreMode || 'exact';
  if (!VALID_SCORE_MODES.includes(scoreMode)) throw new ValidationError('判分模式无效: ' + scoreMode);
  return { type, answer, score, scoreMode };
}

/**
 * 解析题目归属分类: 显式分类必须存在且为主分类(根); 未指定时仅当分类表只有1个主分类才回落
 * @param {number|null|undefined} categoryId - 传入分类ID
 * @returns {Promise<number>} 主分类 id
 */
async function resolveCategoryId(categoryId) {
  if (categoryId) {
    const [cat] = await db.query('SELECT id FROM exam_categories WHERE id = ? AND parent_id = 0', [categoryId]);
    if (cat) return cat.id;
    throw new ValidationError('分类不存在');
  }
  const cats = await db.query(
    'SELECT id FROM exam_categories WHERE parent_id = 0 ORDER BY sort_order ASC, id ASC LIMIT 2'
  );
  if (cats.length === 1) return cats[0].id;
  throw new ValidationError('请选择分类');
}

/**
 * 题库列表(分类/题型/关键词筛选 + 分页)
 * @param {Object} opts - { categoryId?, type?, keyword?, page?, pageSize? }
 * @returns {Promise<Object>} { list, total }
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

/**
 * 新增题目
 * @param {Object} data - { categoryId, type, title, options, answer, analysis?, score?, scoreMode?, shuffleOptions?, titleImage?, analysisImage?, createdBy }
 * @returns {Promise<Object>} { id }
 */
async function create(data) {
  const { type, answer, score, scoreMode } = validateQuestion(data);
  const categoryId = await resolveCategoryId(data.categoryId);

  const result = await db.execute(
    `INSERT INTO exam_questions (category_id, type, title, options, answer, analysis, score, score_mode, shuffle_options, title_image, analysis_image, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [categoryId, type, data.title, JSON.stringify(data.options), answer, data.analysis || null,
      score, scoreMode, data.shuffleOptions ? 1 : 0,
      data.titleImage || null, data.analysisImage || null, data.createdBy || null]
  );
  return { id: result[0].insertId };
}

/**
 * 编辑题目(合并现有行做一致性校验)
 * @param {number} id - 题目ID
 * @param {Object} data - 可更新字段
 * @returns {Promise<Object>} { updated }
 */
async function update(id, data) {
  const [row] = await db.query('SELECT * FROM exam_questions WHERE id = ?', [id]);
  if (!row) throw new BusinessError('题目不存在', null, ErrorCode.ANSWER_QUESTION_NOT_FOUND);

  const merged = {
    type: data.type !== undefined ? data.type : row.type,
    title: data.title !== undefined ? data.title : row.title,
    options: data.options !== undefined ? data.options
      : (typeof row.options === 'string' ? JSON.parse(row.options) : row.options),
    answer: data.answer !== undefined ? data.answer : row.answer,
    score: data.score !== undefined ? data.score : row.score,
    scoreMode: data.scoreMode !== undefined ? data.scoreMode : row.score_mode,
  };
  const needsValidate = ['type', 'title', 'options', 'answer', 'score', 'scoreMode']
    .some((k) => data[k] !== undefined);
  const validated = needsValidate ? validateQuestion(merged) : {};

  const updates = [];
  const params = [];
  if (data.title !== undefined) { updates.push('title = ?'); params.push(data.title); }
  if (data.type !== undefined) { updates.push('type = ?'); params.push(data.type); }
  if (data.options !== undefined) { updates.push('options = ?'); params.push(JSON.stringify(data.options)); }
  if (data.answer !== undefined) { updates.push('answer = ?'); params.push(validated.answer !== undefined ? validated.answer : data.answer); }
  if (data.analysis !== undefined) { updates.push('analysis = ?'); params.push(data.analysis); }
  if (data.score !== undefined) { updates.push('score = ?'); params.push(validated.score !== undefined ? validated.score : data.score); }
  if (data.scoreMode !== undefined) { updates.push('score_mode = ?'); params.push(validated.scoreMode !== undefined ? validated.scoreMode : data.scoreMode); }
  if (data.shuffleOptions !== undefined) { updates.push('shuffle_options = ?'); params.push(data.shuffleOptions ? 1 : 0); }
  if (data.categoryId !== undefined) { updates.push('category_id = ?'); params.push(data.categoryId); }
  if (data.status !== undefined) { updates.push('status = ?'); params.push(data.status); }
  if (data.titleImage !== undefined) { updates.push('title_image = ?'); params.push(data.titleImage || null); }
  if (data.analysisImage !== undefined) { updates.push('analysis_image = ?'); params.push(data.analysisImage || null); }

  if (!updates.length) throw new ValidationError('无更新字段');
  params.push(id);
  await db.execute(`UPDATE exam_questions SET ${updates.join(', ')} WHERE id = ?`, params);
  return { updated: true };
}

/**
 * 删除题目
 * @param {number} id - 题目ID
 * @returns {Promise<Object>} { deleted }
 */
async function remove(id) {
  const [row] = await db.query('SELECT id FROM exam_questions WHERE id = ?', [id]);
  if (!row) throw new BusinessError('题目不存在', null, ErrorCode.ANSWER_QUESTION_NOT_FOUND);
  await db.execute('DELETE FROM exam_questions WHERE id = ?', [id]);
  return { deleted: true };
}

/**
 * 批量导入题目(部分成功策略; 分类一次校验; chunk 批量写入)
 * @param {Array} questions - 题目数组(每行含 categoryId 或依赖唯一分类回落)
 * @param {number} createdBy - 创建人ID
 * @param {number} baseRow - 首题在 Excel 中的行号(默认 2, 表头占第1行)
 * @returns {Promise<Object>} { success, failed, errors }
 */
async function batchImport(questions, createdBy, baseRow = 2) {
  if (!Array.isArray(questions) || !questions.length) {
    throw new ValidationError('导入数据不能为空');
  }

  // 1. 分类一次校验
  const requestedIds = [...new Set(questions.map((q) => q.categoryId).filter(Boolean))];
  const catMap = new Map();
  if (requestedIds.length) {
    const placeholders = requestedIds.map(() => '?').join(',');
    const cats = await db.query(
      `SELECT id FROM exam_categories WHERE id IN (${placeholders}) AND parent_id = 0`,
      requestedIds
    );
    cats.forEach((c) => catMap.set(c.id, c.id));
  }
  // 未指定分类时: 仅当分类表只有1个主分类才回落
  let fallbackId = null;
  if (!requestedIds.length) {
    const cats = await db.query(
      'SELECT id FROM exam_categories WHERE parent_id = 0 ORDER BY sort_order ASC, id ASC LIMIT 2'
    );
    if (cats.length === 1) fallbackId = cats[0].id;
  }

  // 2. 逐行校验
  const validRows = [];
  const errors = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const excelRow = baseRow + i;
    try {
      let categoryId = fallbackId;
      if (q.categoryId) {
        if (!catMap.has(q.categoryId)) throw new ValidationError('分类不存在');
        categoryId = q.categoryId;
      }
      if (!categoryId) throw new ValidationError('请选择分类');
      const { type, answer, score, scoreMode } = validateQuestion(q);
      validRows.push({
        categoryId, type, title: q.title, options: JSON.stringify(q.options), answer,
        analysis: q.analysis || null, score, scoreMode,
        shuffleOptions: q.shuffleOptions ? 1 : 0,
        titleImage: q.titleImage || null, analysisImage: q.analysisImage || null,
        row: excelRow,
      });
    } catch (e) {
      errors.push({ row: excelRow, reason: e.message });
    }
  }

  // 3. chunk 批量写入
  let inserted = 0;
  for (let i = 0; i < validRows.length; i += BATCH_CHUNK) {
    const chunk = validRows.slice(i, i + BATCH_CHUNK);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const params = [];
    chunk.forEach((r) => {
      params.push(r.categoryId, r.type, r.title, r.options, r.answer, r.analysis,
        r.score, r.scoreMode, r.shuffleOptions, r.titleImage, r.analysisImage, createdBy || null);
    });
    try {
      await db.execute(
        `INSERT INTO exam_questions (category_id, type, title, options, answer, analysis, score, score_mode, shuffle_options, title_image, analysis_image, created_by) VALUES ${placeholders}`,
        params
      );
      inserted += chunk.length;
    } catch (e) {
      chunk.forEach((r, j) => errors.push({ row: r.row, reason: '数据库写入失败: ' + e.message }));
    }
  }

  return { success: inserted, failed: errors.length, errors };
}

module.exports = { list, create, update, remove, batchImport, validateQuestion };
