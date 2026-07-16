'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../../common/middleware/auth');
const questionController = require('../controllers/question.controller');
const paperController = require('../controllers/paper.controller');
const examController = require('../controllers/exam.controller');
const recordController = require('../controllers/record.controller');

const adminAuth = [authenticate, requireRole('admin', 'superadmin')];

// ===== 题库管理（管理员） =====
router.post('/questions/list', ...adminAuth, questionController.list);
router.post('/questions/create', ...adminAuth, questionController.create);
router.post('/questions/update', ...adminAuth, questionController.update);
router.post('/questions/delete', ...adminAuth, questionController.delete);
router.post('/questions/batch-import', ...adminAuth, questionController.batchImport);

// ===== 试卷管理（管理员） =====
router.post('/papers/list', ...adminAuth, paperController.list);
router.post('/papers/create', ...adminAuth, paperController.create);
router.post('/papers/update', ...adminAuth, paperController.update);
router.post('/papers/delete', ...adminAuth, paperController.delete);
router.post('/papers/publish', ...adminAuth, paperController.publish);

// ===== 考试（登录用户） =====
router.post('/exam/list', authenticate, examController.examList);
router.post('/exam/start', authenticate, examController.start);
router.post('/exam/submit', authenticate, examController.submit);
router.post('/exam/warn', authenticate, examController.reportWarn);

// ===== 练习（登录用户） =====
router.post('/practice/start', authenticate, examController.startPractice);
router.post('/practice/submit', authenticate, examController.submitPractice);

// ===== 记录 =====
router.post('/records/my', authenticate, recordController.myRecords);
router.post('/records/all', ...adminAuth, recordController.allRecords);
router.post('/records/stats', ...adminAuth, recordController.stats);

module.exports = router;
