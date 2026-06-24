'use strict';

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { authenticate } = require('../../common/middleware/auth');

/**
 * 项目路由
 * 所有路由需要登录认证
 */

// POST /api/project/list — 项目列表（分页+搜索）
router.post('/list', authenticate, projectController.list);

// POST /api/project/detail — 项目详情
router.post('/detail', authenticate, projectController.detail);

// POST /api/project/stats — 项目统计
router.post('/stats', authenticate, projectController.stats);

module.exports = router;
