'use strict';

const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 健康检查
 *     description: 检查服务运行状态，包括数据库和 Redis 连接
 *     tags: [健康检查]
 *     security: []
 *     responses:
 *       200:
 *         description: 服务正常运行
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: 服务降级（部分组件不可用）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/health', healthController.check);

module.exports = router;
