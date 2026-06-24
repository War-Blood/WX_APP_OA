'use strict';

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review.controller');
const { authenticate, requireRole } = require('../../common/middleware/auth');

/**
 * 审核路由
 * 所有路由需要登录认证 + 管理员/超级管理员权限
 */

// POST /api/project/reviewList — 审核列表
router.post('/project/reviewList', authenticate, requireRole('admin', 'superadmin'), reviewController.reviewList);

// POST /api/project/reviewDetail — 审核详情
router.post('/project/reviewDetail', authenticate, requireRole('admin', 'superadmin'), reviewController.reviewDetail);

// POST /api/project/reviewAction — 审核操作（通过/驳回）
router.post('/project/reviewAction', authenticate, requireRole('admin', 'superadmin'), reviewController.reviewAction);

// POST /api/project/reviewStats — 审核统计
router.post('/project/reviewStats', authenticate, requireRole('admin', 'superadmin'), reviewController.reviewStats);

module.exports = router;
