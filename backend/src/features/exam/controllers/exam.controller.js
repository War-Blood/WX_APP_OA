'use strict';

const examService = require('../services/exam.service');
const { success } = require('../../../common/utils/response');

async function examList(req, res, next) {
  try {
    const result = await examService.examList(req.user.userId);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function start(req, res, next) {
  try {
    const { paperId } = req.body;
    const result = await examService.startExam(req.user.userId, paperId);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function submit(req, res, next) {
  try {
    const { recordId, answers } = req.body;
    const result = await examService.submitExam(req.user.userId, recordId, answers || {});
    res.json(success(result));
  } catch (err) { next(err); }
}

async function reportWarn(req, res, next) {
  try {
    const { recordId } = req.body;
    const result = await examService.reportWarn(req.user.userId, recordId);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function saveAnswers(req, res, next) {
  try {
    const { recordId, answers } = req.body;
    const result = await examService.saveAnswers(req.user.userId, recordId, answers || {});
    res.json(success(result));
  } catch (err) { next(err); }
}

async function startPractice(req, res, next) {
  try {
    const { categoryId, type, count } = req.body;
    const result = await examService.startPractice({ userId: req.user.userId, categoryId, type, count });
    res.json(success(result));
  } catch (err) { next(err); }
}

async function submitPractice(req, res, next) {
  try {
    const { recordId, answers } = req.body;
    const result = await examService.submitPractice(req.user.userId, recordId, answers || {});
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = { examList, start, submit, saveAnswers, reportWarn, startPractice, submitPractice };
