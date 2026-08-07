'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../../common/middleware/auth');
const categoryController = require('../controllers/category.controller');
const questionController = require('../controllers/question.controller');
const examController = require('../controllers/exam.controller');
const paperController = require('../controllers/paper.controller');
const recordController = require('../controllers/record.controller');
const wrongController = require('../controllers/wrong.controller');
const favoriteController = require('../controllers/favorite.controller');
const settingController = require('../controllers/setting.controller');

const adminAuth = [authenticate, requireRole('admin', 'superadmin')];

// ===== 分类管理 =====
router.post('/categories/list', authenticate, categoryController.list);
router.post('/categories/create', ...adminAuth, categoryController.create);
router.post('/categories/update', ...adminAuth, categoryController.update);
router.post('/categories/delete', ...adminAuth, categoryController.remove);

// ===== 题库管理 =====
router.post('/questions/list', authenticate, questionController.list);
router.post('/questions/create', ...adminAuth, questionController.create);
router.post('/questions/update', ...adminAuth, questionController.update);
router.post('/questions/delete', ...adminAuth, questionController.remove);
router.post('/questions/batch-import', ...adminAuth, questionController.batchImport);

// ===== 练习（刷题/背题） =====
router.post('/learn/start', authenticate, examController.startLearn);
router.post('/learn/submit', authenticate, examController.submitLearn);

// ===== 模拟考试 =====
router.post('/mock/start', authenticate, examController.startMock);
router.post('/mock/submit', authenticate, examController.submitMock);

// ===== 试卷管理（管理员） =====
router.post('/papers/list', ...adminAuth, paperController.list);
router.post('/papers/create', ...adminAuth, paperController.create);
router.post('/papers/update', ...adminAuth, paperController.update);
router.post('/papers/delete', ...adminAuth, paperController.remove);
router.post('/papers/publish', ...adminAuth, paperController.publish);

// ===== 正式考试（试卷制, 用户可参加列表 + 开始） =====
router.post('/papers/available', authenticate, paperController.available);
router.post('/exam/start', authenticate, examController.startExam);
router.post('/exam/submit', authenticate, examController.submitExam);
router.post('/exam/save-progress', authenticate, examController.saveProgress);

// ===== 记录 / 排行 / 统计 =====
router.post('/records/my', authenticate, recordController.myRecords);
router.post('/records/detail', authenticate, recordController.detail);
router.post('/records/rank', authenticate, recordController.rank);
router.post('/records/all', ...adminAuth, recordController.allRecords);
router.post('/records/export', ...adminAuth, recordController.exportRecords);
router.post('/stats/overview', ...adminAuth, recordController.overview);

// ===== 错题本 =====
router.post('/wrong/list', authenticate, wrongController.list);
router.post('/wrong/remove', authenticate, wrongController.remove);

// ===== 收藏 =====
router.post('/favorite/toggle', authenticate, favoriteController.toggle);
router.post('/favorite/list', authenticate, favoriteController.list);

// ===== 答题设置 =====
router.post('/settings/get', authenticate, settingController.get);
router.post('/settings/update', ...adminAuth, settingController.update);

module.exports = router;
