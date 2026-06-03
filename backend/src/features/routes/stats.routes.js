'use strict';

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const { authenticate } = require('../../common/middleware/auth');

/**
 * 数据统计路由
 * 所有路由需要登录认证
 */

// POST /api/stats/home — 首页统计数据
router.post('/stats/home', authenticate, statsController.home);

// POST /api/stats/activities — 最近动态列表（分页）
router.post('/stats/activities', authenticate, statsController.activities);

// POST /api/stats/profile — 个人中心统计
router.post('/stats/profile', authenticate, statsController.profile);

// POST /api/stats/reportStats — 日报统计看板
router.post('/stats/reportStats', authenticate, statsController.reportStats);

module.exports = router;
