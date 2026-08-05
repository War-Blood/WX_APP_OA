'use strict';

const db = require('../../../common/config/database');
const { BusinessError, NotFoundError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');
const logger = require('../../../common/utils/logger');

/**
 * 考试流程服务 — 开始/交卷/判分/防作弊
 */

/**
 * 校验参加范围
 */
async function checkScope(userId, paper) {
  if (paper.scope_type === 'all') return true;
  if (paper.scope_type === 'department') {
    const [user] = await db.query('SELECT department_id FROM users WHERE id = ?', [userId]);
    const deptIds = typeof paper.scope_departments === 'string'
      ? JSON.parse(paper.scope_departments) : paper.scope_departments;
    return deptIds && deptIds.includes(user.department_id);
  }
  return true;
}

/**
 * 获取可参加的考试列表(仅窗口内已发布卷)
 */
async function examList(userId) {
  const papers = await db.query(
    `SELECT id, title, description, duration, pass_score, total_score, scope_type, scope_departments, start_time, end_time
     FROM exam_papers
     WHERE status = 'published'
       AND (start_time IS NULL OR start_time <= NOW())
       AND (end_time IS NULL OR end_time > NOW())
     ORDER BY created_at DESC`
  );

  const result = [];
  for (const p of papers) {
    if (await checkScope(userId, p)) {
      const [record] = await db.query(
        'SELECT id, score, status FROM exam_records WHERE user_id = ? AND paper_id = ? AND mode = ? ORDER BY created_at DESC LIMIT 1',
        [userId, p.id, 'exam']
      );
      result.push({
        paperId: p.id, title: p.title, description: p.description,
        duration: p.duration, passScore: p.pass_score,
        startTime: p.start_time, endTime: p.end_time,
        recordId: record ? record.id : null,
        hasSubmitted: !!record, score: record ? record.score : null,
        isPass: record ? (record.score >= p.pass_score) : null,
        status: record ? record.status : null,
      });
    }
  }
  return result;
}

/**
 * 进入/恢复正式考试
 * - 窗口检查(start_time/end_time,北京时间)
 * - 已有 doing 记录 → 断线恢复(返回 remainingSeconds + savedAnswers),不新建、不消耗次数
 * - 无 doing → 次数检查后新建
 */
async function startExam(userId, paperId) {
  const [paper] = await db.query('SELECT * FROM exam_papers WHERE id = ?', [paperId]);
  if (!paper) throw new NotFoundError('试卷不存在');
  if (paper.status !== 'published') throw new BusinessError('试卷未发布', null, ErrorCode.EXAM_PAPER_NOT_PUBLISHED);

  const now = Date.now();
  // 窗口检查(考试区间)
  if (paper.start_time && now < new Date(paper.start_time).getTime()) {
    throw new BusinessError('考试尚未开始', null, ErrorCode.EXAM_PAPER_NOT_PUBLISHED);
  }
  if (paper.end_time && now >= new Date(paper.end_time).getTime()) {
    throw new BusinessError('考试已结束', null, ErrorCode.EXAM_PAPER_NOT_PUBLISHED);
  }

  // 校验范围
  if (!(await checkScope(userId, paper))) {
    throw new BusinessError('您不在本次考试参加范围内', null, ErrorCode.EXAM_SCOPE_DENIED);
  }

  // 断线恢复:已有进行中的 doing 记录
  const [existing] = await db.query(
    "SELECT * FROM exam_records WHERE user_id = ? AND paper_id = ? AND mode = 'exam' AND status = 'doing' ORDER BY id DESC LIMIT 1",
    [userId, paperId]
  );
  if (existing) {
    const elapsedMs = now - new Date(existing.server_time).getTime();
    const remainingSeconds = Math.max(0, paper.duration * 60 - Math.floor(elapsedMs / 1000));
    const endReached = paper.end_time && now >= new Date(paper.end_time).getTime();
    if (remainingSeconds > 0 && !endReached) {
      const snapshot = typeof existing.question_snapshot === 'string' ? JSON.parse(existing.question_snapshot) : existing.question_snapshot;
      const savedAnswers = existing.answers ? (typeof existing.answers === 'string' ? JSON.parse(existing.answers) : existing.answers) : {};
      logger.info('恢复考试', { module: 'EXAM', userId, paperId, recordId: existing.id, remainingSeconds });
      return {
        recordId: existing.id, snapshot, serverTime: existing.server_time, duration: paper.duration,
        remainingSeconds, savedAnswers, resumed: true,
      };
    }
    // 个人超时或窗口已结束 → 置 timeout(计一次),次数允许则重来
    await db.execute("UPDATE exam_records SET status = 'timeout', end_time = NOW() WHERE id = ?", [existing.id]);
  }

  // 检查最大次数(仅 submitted/timeout/cheated 计次;断线恢复不产生新记录,不消耗次数)
  if (paper.max_attempts > 0) {
    const [count] = await db.query(
      "SELECT COUNT(*) AS cnt FROM exam_records WHERE user_id = ? AND paper_id = ? AND mode = 'exam' AND status IN ('submitted','timeout','cheated')",
      [userId, paperId]
    );
    if (count.cnt >= paper.max_attempts) {
      throw new BusinessError('已达最大考试次数', null, ErrorCode.EXAM_MAX_ATTEMPTS);
    }
  }

  // 组装快照
  const questionIds = typeof paper.question_ids === 'string' ? JSON.parse(paper.question_ids) : paper.question_ids;
  const questions = await db.query(
    `SELECT id, type, title, options, answer, analysis, score, score_mode FROM exam_questions WHERE id IN (${questionIds.map(() => '?').join(',')})`,
    questionIds
  );

  const snapshot = questions.map(q => ({
    id: q.id, type: q.type, title: q.title,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    answer: q.answer, analysis: q.analysis, score: q.score, scoreMode: q.score_mode,
  }));

  const totalScore = snapshot.reduce((sum, q) => sum + q.score, 0);

  const result = await db.execute(
    `INSERT INTO exam_records (user_id, paper_id, paper_version, mode, question_snapshot, total_score, server_time, start_time, status)
     VALUES (?, ?, ?, 'exam', ?, ?, NOW(), NOW(), 'doing')`,
    [userId, paperId, paper.version, JSON.stringify(snapshot), totalScore]
  );

  logger.info('开始考试', { module: 'EXAM', userId, paperId });

  return {
    recordId: result[0].insertId, snapshot, serverTime: new Date().toISOString(), duration: paper.duration,
    remainingSeconds: paper.duration * 60, resumed: false,
  };
}

/**
 * 保存答题进度(断线续答数据源)
 */
async function saveAnswers(userId, recordId, answers) {
  const [record] = await db.query('SELECT id, status FROM exam_records WHERE id = ? AND user_id = ?', [recordId, userId]);
  if (!record) throw new NotFoundError('考试记录不存在');
  if (record.status !== 'doing') throw new BusinessError('考试已结束');
  await db.execute('UPDATE exam_records SET answers = ? WHERE id = ?', [JSON.stringify(answers || {}), recordId]);
  return { saved: true };
}

/**
 * 提交考试答案 + 判分
 */
async function submitExam(userId, recordId, answers) {
  const [record] = await db.query('SELECT * FROM exam_records WHERE id = ? AND user_id = ?', [recordId, userId]);
  if (!record) throw new NotFoundError('考试记录不存在');
  if (record.status !== 'doing') throw new BusinessError('考试已结束');

  // 计时校验
  const [paper] = await db.query('SELECT duration, pass_score FROM exam_papers WHERE id = ?', [record.paper_id]);
  const elapsed = (Date.now() - new Date(record.server_time).getTime()) / 60000;
  if (elapsed > paper.duration + 1) {
    await db.execute("UPDATE exam_records SET status = 'timeout', end_time = NOW() WHERE id = ?", [recordId]);
    throw new BusinessError('考试已超时', null, ErrorCode.EXAM_TIME_UP);
  }

  // 判分
  const snapshot = typeof record.question_snapshot === 'string' ? JSON.parse(record.question_snapshot) : record.question_snapshot;
  let score = 0;
  const details = [];

  for (const q of snapshot) {
    const userAnswer = answers[String(q.id)] || '';
    let correct = false;
    let earnedPoints = 0;

    if (q.type === 'single' || q.type === 'judge') {
      correct = userAnswer === q.answer;
      earnedPoints = correct ? q.score : 0;
    } else if (q.type === 'multiple') {
      if (q.scoreMode === 'partial') {
        const userSet = new Set(userAnswer.split(','));
        const correctSet = new Set(q.answer.split(','));
        const hasError = [...userSet].some(k => !correctSet.has(k));
        if (!hasError) {
          const matchCount = [...userSet].filter(k => correctSet.has(k)).length;
          earnedPoints = Math.round(q.score * matchCount / correctSet.size);
          correct = matchCount === correctSet.size;
        }
      } else {
        const u = userAnswer.split(',').sort().join(',');
        const c = q.answer.split(',').sort().join(',');
        correct = u === c;
        earnedPoints = correct ? q.score : 0;
      }
    }
    score += earnedPoints;
    details.push({ questionId: q.id, type: q.type, title: q.title, correct, userAnswer, rightAnswer: q.answer, analysis: q.analysis, earnedPoints, totalPoints: q.score });
  }

  const isPass = score >= paper.pass_score;
  await db.execute(
    "UPDATE exam_records SET answers = ?, score = ?, is_pass = ?, end_time = NOW(), status = 'submitted' WHERE id = ?",
    [JSON.stringify(answers), score, isPass ? 1 : 0, recordId]
  );

  logger.info('交卷判分', { module: 'EXAM', userId, recordId, score });

  return { score, totalScore: record.total_score, isPass, details };
}

/**
 * 截屏警告上报
 */
async function reportWarn(userId, recordId) {
  const [record] = await db.query('SELECT * FROM exam_records WHERE id = ? AND user_id = ?', [recordId, userId]);
  if (!record) throw new NotFoundError('考试记录不存在');

  const [paper] = await db.query('SELECT max_screenshot_warns FROM exam_papers WHERE id = ?', [record.paper_id]);
  const maxWarns = paper.max_screenshot_warns;

  await db.execute('UPDATE exam_records SET warn_count = warn_count + 1 WHERE id = ?', [recordId]);

  if (record.warn_count + 1 >= maxWarns) {
    await db.execute("UPDATE exam_records SET status = 'cheated', end_time = NOW(), score = 0, is_pass = 0 WHERE id = ?", [recordId]);
    logger.warn('考试作弊标记', { module: 'EXAM', userId, recordId, warns: record.warn_count + 1 });
    return { warned: true, forceEnd: true };
  }

  return { warned: true, forceEnd: false };
}

/**
 * 开始模拟练习
 */
async function startPractice({ userId, categoryId, type, count = 20 }) {
  const conditions = ["status = 'active'"];
  const params = [];
  if (categoryId) { conditions.push('category_id = ?'); params.push(categoryId); }
  if (type) {
    const types = Array.isArray(type) ? type : [type];
    conditions.push(`type IN (${types.map(() => '?').join(',')})`);
    params.push(...types);
  }

  const questions = await db.query(
    `SELECT id, type, title, options, answer, analysis, score, score_mode FROM exam_questions WHERE ${conditions.join(' AND ')} ORDER BY RAND() LIMIT ?`,
    [...params, Math.min(count, 100)]
  );

  const snapshot = questions.map(q => ({
    id: q.id, type: q.type, title: q.title,
    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    answer: q.answer, analysis: q.analysis, score: q.score, scoreMode: q.score_mode,
  }));
  const totalScore = snapshot.reduce((s, q) => s + q.score, 0);

  const result = await db.execute(
    `INSERT INTO exam_records (user_id, paper_id, mode, question_snapshot, total_score, start_time, status)
     VALUES (?, 0, 'practice', ?, ?, NOW(), 'doing')`,
    [userId, JSON.stringify(snapshot), totalScore]
  );

  return { recordId: result[0].insertId, snapshot };
}

/**
 * 提交练习答案
 */
async function submitPractice(userId, recordId, answers) {
  const [record] = await db.query('SELECT * FROM exam_records WHERE id = ? AND user_id = ?', [recordId, userId]);
  if (!record) throw new NotFoundError('练习记录不存在');
  if (record.status !== 'doing') throw new BusinessError('练习已结束');

  const snapshot = typeof record.question_snapshot === 'string' ? JSON.parse(record.question_snapshot) : record.question_snapshot;
  let correctCount = 0;
  const details = [];

  for (const q of snapshot) {
    const userAnswer = answers[String(q.id)] || '';
    const correct = userAnswer === q.answer;
    if (correct) correctCount++;
    details.push({ questionId: q.id, type: q.type, title: q.title, correct, userAnswer, rightAnswer: q.answer, analysis: q.analysis });
  }

  // 练习记录不持久化:模拟结束后删除对应记录,避免 DB 负担
  await db.execute('DELETE FROM exam_records WHERE id = ?', [recordId]);

  return { correctCount, totalCount: snapshot.length, details };
}

module.exports = { examList, checkScope, startExam, submitExam, saveAnswers, reportWarn, startPractice, submitPractice };
