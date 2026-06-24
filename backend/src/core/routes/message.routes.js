'use strict';

const router = require('express').Router();
const messageController = require('../controllers/message.controller');
const { authenticate } = require('../../common/middleware/auth');

/**
 * @swagger
 * tags:
 *   - name: 消息通知
 *     description: 消息通知相关接口
 */

/**
 * @swagger
 * /api/message/list:
 *   post:
 *     summary: 消息列表（分页）
 *     description: 获取当前用户的消息列表，支持按 type 筛选和分页
 *     tags: [消息通知]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: integer
 *                 default: 1
 *                 description: 当前页码
 *               pageSize:
 *                 type: integer
 *                 default: 20
 *                 description: 每页条数
 *               type:
 *                 type: string
 *                 description: 消息类型筛选（可选）
 *     responses:
 *       200:
 *         description: 分页消息列表
 */
router.post('/list', authenticate, messageController.list);

/**
 * @swagger
 * /api/message/detail:
 *   post:
 *     summary: 消息详情
 *     description: 根据消息 ID 获取详情
 *     tags: [消息通知]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 消息 ID
 *     responses:
 *       200:
 *         description: 消息详情
 */
router.post('/detail', authenticate, messageController.detail);

/**
 * @swagger
 * /api/message/unread:
 *   post:
 *     summary: 未读消息数
 *     description: 获取当前用户的未读消息数量
 *     tags: [消息通知]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: 未读消息数
 */
router.post('/unread', authenticate, messageController.unreadCount);

/**
 * @swagger
 * /api/message/markRead:
 *   post:
 *     summary: 标记已读
 *     description: 将指定消息标记为已读
 *     tags: [消息通知]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 消息 ID
 *     responses:
 *       200:
 *         description: 标记成功
 */
router.post('/markRead', authenticate, messageController.markRead);

// POST /api/message/delete — 删除消息
router.post('/delete', authenticate, messageController.delete);

module.exports = router;
