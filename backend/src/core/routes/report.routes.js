'use strict';

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../../common/middleware/auth');

/**
 * 日报路由
 * 所有路由需要登录认证
 */

// POST /api/report/list — 日报列表（分页+筛选）
router.post('/list', authenticate, reportController.list);

// POST /api/report/detail — 日报详情
router.post('/detail', authenticate, reportController.detail);

// POST /api/report/submit — 提交日报
router.post('/submit', authenticate, reportController.submit);

// POST /api/report/draft — 保存草稿
router.post('/draft', authenticate, reportController.saveDraft);

// GET /api/report/draft — 获取草稿
router.get('/draft', authenticate, reportController.getDraft);

// POST /api/report/delete — 删除日报（仅草稿/已驳回）
router.post('/delete', authenticate, reportController.deleteReport);

// GET /api/report/workerList — 作业人员名单（去重）
router.get('/workerList', authenticate, reportController.workerList);

// POST /api/report/workerStats — 人员统计看板
router.post('/workerStats', authenticate, reportController.workerStats);

// POST /api/report/export — 导出CSV
router.post('/export', authenticate, reportController.exportCSV);

module.exports = router;
