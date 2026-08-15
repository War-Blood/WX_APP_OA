'use strict';

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../../common/middleware/auth');
const pushController = require('../controllers/push.controller');

/**
 * @swagger
 * tags:
 *   - name: 定时消息推送
 *     description: 条件化定时消息推送（企微群机器人 Webhook）
 */

const adminAuth = [authenticate, requireRole('admin', 'superadmin')];

// ===== 群机器人 =====
router.post('/webhooks/list', ...adminAuth, pushController.webhookList);
router.post('/webhooks/create', ...adminAuth, pushController.webhookCreate);
router.post('/webhooks/update', ...adminAuth, pushController.webhookUpdate);
router.post('/webhooks/delete', ...adminAuth, pushController.webhookDelete);
router.post('/webhooks/toggle', ...adminAuth, pushController.webhookToggle);

// ===== 推送脚本 =====
router.post('/scripts/list', ...adminAuth, pushController.scriptList);
router.post('/scripts/detail', ...adminAuth, pushController.scriptDetail);
router.post('/scripts/create', ...adminAuth, pushController.scriptCreate);
router.post('/scripts/update', ...adminAuth, pushController.scriptUpdate);
router.post('/scripts/delete', ...adminAuth, pushController.scriptDelete);
router.post('/scripts/toggle', ...adminAuth, pushController.scriptToggle);
router.post('/scripts/test', ...adminAuth, pushController.scriptTest);

// ===== 执行日志 =====
router.post('/logs/list', ...adminAuth, pushController.logList);
router.post('/logs/detail', ...adminAuth, pushController.logDetail);

// ===== 数据源元信息 =====
router.post('/data-sources/list', ...adminAuth, pushController.dataSources);

module.exports = router;
