'use strict';

const db = require('../../../common/config/database');
const { BusinessError, NotFoundError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');
const logger = require('../../../common/utils/logger');

/**
 * 答题流程服务 — 练习/模拟/正式考试 抽题+判分+错题归集+断线续答+超时扫描
 */

/**
 * Fisher-Yates 洗牌(返回新数组)
 * @param {Array} arr - 原数组
 * @returns {Array} 打乱后的新数组
 */
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 打乱选项顺序并重映射答案键(A/B/C → 新位置字母)
 * @param {Array} options - 选项数组
 * @param {string} answer - 答案键, 多选逗号分隔
 * @returns {Object} { options, answer }
 */
function shuffleOptions(options, answer) {
  const byKey = {};
  options.forEach((o) => { byKey[o.key] = o.text; });
  const shuffled = shuffleArray(options.map((o) => o.key));
  const newOptions = shuffled.map((k, i) => ({ key: String.fromCharCode(65 + i), text: byKey[k] }));
  const newAnswer = answer.split(',').map((k) => String.fromCharCode(65 + shuffled.indexOf(k))).join(',');
  return { options: newOptions, answer: newAnswer };
}

/**
 * 分类子树 id(含自身, 递归收集子孙)
 * @param {number} rootId - 根分类ID
 * @returns {Promise<Array<number>>} id 数组
 */
async function getCategorySubtreeIds(rootId) {
  const ids = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const pid = queue.shift();
    const children = await db.query('SELECT id FROM exam_categories WHERE parent_id = ?', [pid]);
    children.forEach((c) => { ids.push(c.id); queue.push(c.id); });
  }
  return ids;
}

/**
 * 解析 JSON 字段(string|array → array)
 * @param {*} v - 原值
 * @returns {Array} 解析后的数组
 */
function parseArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch (e) { return []; }
}

/**
 * 单题判分
 * @param {Object} q - 快照题目
 * @param {string} userAnswer - 用户答案(多选逗号分隔)
 * @returns {Object} { correct, earnedPoints }
 */
function gradeOne(q, userAnswer) {
  let correct = false;
  let earnedPoints = 0;
  if (q.type === 'single' || q.type === 'judge') {
    correct = userAnswer === q.answer;
    earnedPoints = correct ? q.score : 0;
  } else if (q.type === 'multiple') {
    if (q.scoreMode === 'partial') {
      const userSet = new Set(userAnswer.split(','));
      const correctSet = new Set(q.answer.split(','));
      const hasError = [...userSet].some((k) => k && !correctSet.has(k));
      if (!hasError) {
        const matchCount = [...userSet].filter((k) => k && correctSet.has(k)).length;
        earnedPoints = Math.round(q.score * matchCount / correctSet.size);
        correct = matchCount === correctSet.size;
      }
    } else {
      const u = userAnswer.split(',').filter(Boolean).sort().join(',');
      const c = q.answer.split(',').filter(Boolean).sort().join(',');
      correct = u === c;
      earnedPoints = correct ? q.score : 0;
    }
  }
  return { correct, earnedPoints };
}

/**
 * 基于快照判分(与详情重判共用)
 * @param {Array} snapshot - 快照
 * @param {Object} answers - { questionId: answer }
 * @returns {Object} { score, details }
 */
function gradeSnapshot(snapshot, answers) {
  let score = 0;
  const details = [];
  snapshot.forEach((q) => {
    const userAnswer = answers[String(q.id)] || '';
    const { correct, earnedPoints } = gradeOne(q, userAnswer);
    score += earnedPoints;
    details.push({
      questionId: q.id, type: q.type, title: q.title,
      options: q.options, userAnswer, rightAnswer: q.answer,
      analysis: q.analysis, correct, earnedPoints, totalPoints: q.score,
    });
  });
  return { score, details };
}

/**
 * 错题归集(答错题 upsert 进错题本)
 * @param {number} userId - 用户ID
 * @param {Array<number>} questionIds - 答错题目ID列表
 * @returns {Promise<void>}
 */
async function upsertWrongQuestions(userId, questionIds) {
  const uniq = [...new Set(questionIds.filter((id) => id != null))];
  if (!uniq.length) return;
  for (const questionId of uniq) {
    await db.execute(
      `INSERT INTO exam_wrong_questions (user_id, question_id, wrong_count)
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE wrong_count = wrong_count + 1, last_wrong_at = NOW()`,
      [userId, questionId]
    );
  }
}

/**
 * 取分类(不存在抛错)
 * @param {number} categoryId - 分类ID
 * @returns {Promise<Object>} 分类
 */
async function getCategoryOrThrow(categoryId) {
  const [category] = await db.query('SELECT * FROM exam_categories WHERE id = ?', [categoryId]);
  if (!category) throw new NotFoundError('分类不存在');
  return category;
}

/**
 * 练习抽题(顺序/随机/专项/题型 + 背题模式)
 * @param {Object} opts - { userId, categoryId?, type?, mode?, count?, backMemorize? }
 * @returns {Promise<Object>} { recordId?, snapshot }
 */
async function startLearn({ userId, categoryId, type, mode = 'random', count, backMemorize = false }) {
  const conditions = ["q.status = 'active'"];
  const params = [];
  const limit = Math.min(count || 20, 200);

  // 分类子树范围
  if (categoryId) {
    const subtree = await getCategorySubtreeIds(categoryId);
    conditions.push(`q.category_id IN (${subtree.map(() => '?').join(',')})`);
    params.push(...subtree);
  }
  // 题型过滤
  if (type) {
    const types = Array.isArray(type) ? type : [type];
    conditions.push(`q.type IN (${types.map(() => '?').join(',')})`);
    params.push(...types);
  }

  // 抽题顺序
  let orderBy = 'RAND()';
  if (mode === 'order' || mode === 'special') orderBy = 'q.id ASC';

  const questions = await db.query(
    `SELECT q.id, q.type, q.title, q.options, q.answer, q.analysis, q.score, q.score_mode, q.shuffle_options
     FROM exam_questions q WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} LIMIT ?`,
    [...params, limit]
  );

  const snapshot = questions.map((q) => {
    let options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
    let answer = q.answer;
    if (q.shuffle_options && Array.isArray(options) && options.length > 1) {
      const shuffled = shuffleOptions(options, answer);
      options = shuffled.options;
      answer = shuffled.answer;
    }
    return {
      id: q.id, type: q.type, title: q.title, options, answer,
      analysis: q.analysis, score: q.score, scoreMode: q.score_mode,
    };
  });

  // 背题模式: 直接带答案返回, 不建记录、不计分
  if (backMemorize) {
    return { snapshot };
  }

  // 练习模式: 建临时记录(提交后删除), 库内存完整快照供判分, 返回给客户端的不含答案
  const safeSnapshot = snapshot.map(({ answer, ...q }) => q);
  const totalScore = snapshot.reduce((s, q) => s + q.score, 0);
  const result = await db.execute(
    `INSERT INTO exam_records (user_id, category_id, mode, question_snapshot, total_score, start_time, status)
     VALUES (?, ?, 'practice', ?, ?, NOW(), 'doing')`,
    [userId, categoryId || 0, JSON.stringify(snapshot), totalScore]
  );
  return { recordId: result[0].insertId, snapshot: safeSnapshot };
}

/**
 * 提交练习(判分 + 错题归集 + 删除记录)
 * @param {number} userId - 用户ID
 * @param {number} recordId - 练习记录ID
 * @param {Object} answers - 答案
 * @returns {Promise<Object>} { score, totalScore, details }
 */
async function submitLearn(userId, recordId, answers) {
  const [record] = await db.query(
    "SELECT * FROM exam_records WHERE id = ? AND user_id = ? AND mode = 'practice'",
    [recordId, userId]
  );
  if (!record) throw new NotFoundError('练习记录不存在');
  if (record.status !== 'doing') throw new BusinessError('练习已结束');

  const snapshot = typeof record.question_snapshot === 'string' ? JSON.parse(record.question_snapshot) : record.question_snapshot;
  const { score, details } = gradeSnapshot(snapshot, answers || {});
  await upsertWrongQuestions(userId, details.filter((d) => !d.correct).map((d) => d.questionId));

  // 练习记录不持久化: 提交后删除, 避免数据库膨胀(沿用 需求修改/1.md 决策)
  await db.execute('DELETE FROM exam_records WHERE id = ?', [recordId]);

  return { score, totalScore: record.total_score, details };
}

/**
 * 开始限时答题(正式考试/模拟考试共用)
 * @param {number} userId - 用户ID
 * @param {number} categoryId - 分类ID
 * @param {string} mode - 'exam' | 'mock'
 * @returns {Promise<Object>} 开始/恢复结果
 */
async function startTimed(userId, categoryId, mode) {
  const category = await getCategoryOrThrow(categoryId);
  const drawCount = Math.min(category.question_num || 20, 200);

  // 断线恢复: 已有进行中的 doing
  const [existing] = await db.query(
    'SELECT * FROM exam_records WHERE user_id = ? AND category_id = ? AND mode = ? AND status = ? ORDER BY id DESC LIMIT 1',
    [userId, categoryId, mode, 'doing']
  );
  if (existing) {
    const elapsedMs = Date.now() - new Date(existing.server_time).getTime();
    const remainingSeconds = Math.max(0, category.time * 60 - Math.floor(elapsedMs / 1000));
    if (remainingSeconds > 0) {
      const snapshot = typeof existing.question_snapshot === 'string' ? JSON.parse(existing.question_snapshot) : existing.question_snapshot;
      const safeSnapshot = snapshot.map(({ answer, ...q }) => q);
      const savedAnswers = existing.answers ? (typeof existing.answers === 'string' ? JSON.parse(existing.answers) : existing.answers) : {};
      logger.info('恢复答题', { module: 'ANSWER', userId, categoryId, mode, recordId: existing.id, remainingSeconds });
      return {
        recordId: existing.id, snapshot: safeSnapshot, serverTime: existing.server_time, duration: category.time,
        remainingSeconds, savedAnswers, resumed: true,
      };
    }
    // 个人超时 → 置 timeout
    await db.execute("UPDATE exam_records SET status = 'timeout', end_time = NOW() WHERE id = ?", [existing.id]);
  }

  // 随机抽题 + 快照(不含答案)
  const subtree = await getCategorySubtreeIds(categoryId);
  const questions = await db.query(
    `SELECT id, type, title, options, answer, analysis, score, score_mode, shuffle_options
     FROM exam_questions
     WHERE status = 'active' AND category_id IN (${subtree.map(() => '?').join(',')})
     ORDER BY RAND() LIMIT ?`,
    [...subtree, drawCount]
  );
  const snapshot = questions.map((q) => {
    let options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
    let answer = q.answer;
    if (q.shuffle_options && Array.isArray(options) && options.length > 1) {
      const shuffled = shuffleOptions(options, answer);
      options = shuffled.options;
      answer = shuffled.answer;
    }
    return { id: q.id, type: q.type, title: q.title, options, answer, analysis: q.analysis, score: q.score, scoreMode: q.score_mode };
  });
  const totalScore = snapshot.reduce((s, q) => s + q.score, 0);
  const safeSnapshot = snapshot.map(({ answer, ...q }) => q);

  const result = await db.execute(
    `INSERT INTO exam_records (user_id, category_id, mode, question_snapshot, total_score, server_time, start_time, status)
     VALUES (?, ?, ?, ?, ?, NOW(), NOW(), 'doing')`,
    [userId, categoryId, mode, JSON.stringify(snapshot), totalScore]
  );

  logger.info('开始答题', { module: 'ANSWER', userId, categoryId, mode });

  return {
    recordId: result[0].insertId, snapshot: safeSnapshot, serverTime: new Date().toISOString(), duration: category.time,
    remainingSeconds: category.time * 60, savedAnswers: {}, resumed: false,
  };
}

/**
 * 保存答题进度(断线续答)
 * @param {number} userId - 用户ID
 * @param {number} recordId - 记录ID
 * @param {Object} answers - 答案
 * @returns {Promise<Object>} { saved }
 */
async function saveProgress(userId, recordId, answers) {
  const [record] = await db.query(
    "SELECT id, status FROM exam_records WHERE id = ? AND user_id = ? AND mode IN ('exam','mock')",
    [recordId, userId]
  );
  if (!record) throw new NotFoundError('答题记录不存在');
  if (record.status !== 'doing') throw new BusinessError('答题已结束');
  await db.execute('UPDATE exam_records SET answers = ? WHERE id = ?', [JSON.stringify(answers || {}), recordId]);
  return { saved: true };
}

/**
 * 交卷判分(正式考试/模拟考试共用)
 * @param {number} userId - 用户ID
 * @param {number} recordId - 记录ID
 * @param {Object} answers - 答案
 * @param {string} mode - 'exam' | 'mock'
 * @returns {Promise<Object>} { recordId, score, totalScore, details, status }
 */
async function submitTimed(userId, recordId, answers, mode) {
  const [record] = await db.query(
    'SELECT * FROM exam_records WHERE id = ? AND user_id = ? AND mode = ?',
    [recordId, userId, mode]
  );
  if (!record) throw new NotFoundError('答题记录不存在');
  if (record.status !== 'doing') {
    // 幂等: 已提交则直接返回既有结果
    const existed = gradeRecord(record);
    return { recordId, score: existed.score, totalScore: existed.totalScore, details: existed.details, status: record.status };
  }

  const snapshot = typeof record.question_snapshot === 'string' ? JSON.parse(record.question_snapshot) : record.question_snapshot;
  const { score, details } = gradeSnapshot(snapshot, answers || {});

  // 服务端超时校验
  const category = await getCategoryOrThrow(record.category_id);
  const elapsedSec = Math.round((Date.now() - new Date(record.server_time).getTime()) / 1000);
  const status = elapsedSec > category.time * 60 + 5 ? 'timeout' : 'submitted';
  const useTime = Math.min(elapsedSec, category.time * 60);

  await upsertWrongQuestions(userId, details.filter((d) => !d.correct).map((d) => d.questionId));
  await db.execute(
    "UPDATE exam_records SET answers = ?, score = ?, use_time = ?, end_time = NOW(), status = ? WHERE id = ?",
    [JSON.stringify(answers || {}), score, useTime, status, recordId]
  );

  logger.info('交卷判分', { module: 'ANSWER', userId, recordId, mode, score, status });

  return { recordId, score, totalScore: record.total_score, details, status };
}

/**
 * 由已提交记录重判(详情/幂等返回)
 * @param {Object} record - 记录
 * @returns {Object} { score, totalScore, details }
 */
function gradeRecord(record) {
  const snapshot = typeof record.question_snapshot === 'string' ? JSON.parse(record.question_snapshot) : record.question_snapshot;
  const answers = typeof record.answers === 'string' ? JSON.parse(record.answers || '{}') : (record.answers || {});
  return gradeSnapshot(snapshot, answers);
}

/**
 * 超时扫描(定时任务): doing 且超过分类时长 → timeout
 * @returns {Promise<number>} 更新行数
 */
async function scanTimeoutExams() {
  const result = await db.execute(
    `UPDATE exam_records r
     SET r.status = 'timeout', r.end_time = NOW()
     WHERE r.status = 'doing' AND r.mode IN ('exam','mock')
       AND NOW() > DATE_ADD(r.server_time, INTERVAL (SELECT c.time FROM exam_categories c WHERE c.id = r.category_id) MINUTE)`
  );
  const affected = result[0].affectedRows || 0;
  if (affected > 0) logger.info('超时扫描', { module: 'ANSWER', affected });
  return affected;
}

module.exports = {
  startLearn, submitLearn, startTimed, submitTimed, saveProgress, scanTimeoutExams, gradeRecord, gradeSnapshot,
};
