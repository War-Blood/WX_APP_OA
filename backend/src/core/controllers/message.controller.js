'use strict';

const messageService = require('../services/message.service');
const { success, paginated } = require('../../common/utils/response');

/**
 * 消息列表（分页）
 * POST /api/message/list
 */
async function list(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, pageSize = 20, type } = req.body;
    const result = await messageService.list(userId, { page, pageSize, type });
    res.json(paginated(result.list, result.total, result.page, result.pageSize));
  } catch (err) {
    next(err);
  }
}

/**
 * 消息详情
 * POST /api/message/detail
 */
async function detail(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.body;
    const message = await messageService.detail(id, userId);
    res.json(success(message));
  } catch (err) {
    next(err);
  }
}

/**
 * 未读消息数
 * POST /api/message/unread
 */
async function unreadCount(req, res, next) {
  try {
    const userId = req.user.userId;
    const count = await messageService.unreadCount(userId);
    res.json(success({ count }));
  } catch (err) {
    next(err);
  }
}

/**
 * 标记已读
 * POST /api/message/markRead
 */
async function markRead(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.body;
    await messageService.markRead(id, userId);
    res.json(success());
  } catch (err) {
    next(err);
  }
}

async function del(req, res, next) {
  try {
    const userId = req.user.userId;
    const { id } = req.body;
    await messageService.delete(userId, id);
    res.json(success(null, '已删除'));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail, unreadCount, markRead, delete: del };
