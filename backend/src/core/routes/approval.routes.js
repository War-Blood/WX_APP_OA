'use strict';

const express = require('express');
const router = express.Router();
const approvalController = require('../controllers/approval.controller');
const { authenticate } = require('../../common/middleware/auth');

/**
 * 审批路由
 * 所有路由需要登录认证
 */

// POST /api/approval/list — 审批列表（分页+筛选）
router.post('/list', authenticate, approvalController.list);

// POST /api/approval/detail — 审批详情
router.post('/detail', authenticate, approvalController.detail);

// POST /api/approval/create — 创建审批
router.post('/create', authenticate, approvalController.create);

// POST /api/approval/approve — 审批通过/驳回
router.post('/approve', authenticate, approvalController.approve);

module.exports = router;
