'use strict';

const examService = require('../services/exam.service');
const { success } = require('../../../common/utils/response');

/**
 * 答题流程控制器 — 练习/模拟/正式考试
 */

/** 开始练习(含背题模式) */
async function startLearn(req, res, next) {
  try {
    const { categoryId, type, mode, count, backMemorize } = req.body;
    const result = await examService.startLearn({ userId: req.user.userId, categoryId, type, mode, count, backMemorize });
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 提交练习 */
async function submitLearn(req, res, next) {
  try {
    const { recordId, answers } = req.body;
    const result = await examService.submitLearn(req.user.userId, recordId, answers || {});
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 开始模拟考试 */
async function startMock(req, res, next) {
  try {
    const { categoryId } = req.body;
    const result = await examService.startTimed(req.user.userId, categoryId, 'mock');
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 交卷(模拟考试) */
async function submitMock(req, res, next) {
  try {
    const { recordId, answers } = req.body;
    const result = await examService.submitTimed(req.user.userId, recordId, answers || {}, 'mock');
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 开始正式考试（试卷制） */
async function startExam(req, res, next) {
  try {
    const { paperId } = req.body;
    const result = await examService.startPaperExam(req.user.userId, paperId);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 交卷(正式考试) */
async function submitExam(req, res, next) {
  try {
    const { recordId, answers } = req.body;
    const result = await examService.submitTimed(req.user.userId, recordId, answers || {}, 'exam');
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 保存进度(断线续答) */
async function saveProgress(req, res, next) {
  try {
    const { recordId, answers } = req.body;
    const result = await examService.saveProgress(req.user.userId, recordId, answers || {});
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = { startLearn, submitLearn, startMock, submitMock, startExam, submitExam, saveProgress };
