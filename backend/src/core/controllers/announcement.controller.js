'use strict';

const announcementService = require('../services/announcement.service');
const { success, paginated } = require('../../common/utils/response');
const { ValidationError } = require('../../common/utils/errors');

async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 20, keyword, status, priority } = req.body;
    const result = await announcementService.list({
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      keyword,
      status,
      priority,
    });
    res.json(paginated(result.list, result.total, result.page, result.pageSize));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { title, content, priority, targetDepartments } = req.body;
    const result = await announcementService.create({
      title,
      content,
      priority,
      targetDepartments,
      authorId: req.user.userId,
    });
    res.json(success(result, '公告已创建'));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!id) throw new ValidationError('公告ID不能为空');
    const result = await announcementService.update({ id, ...req.body });
    res.json(success(result, '公告已更新'));
  } catch (err) {
    next(err);
  }
}

async function publish(req, res, next) {
  try {
    const { id } = req.params;
    const result = await announcementService.setStatus(id, 'published');
    res.json(success(result, '公告已发布'));
  } catch (err) {
    next(err);
  }
}

async function cancel(req, res, next) {
  try {
    const { id } = req.params;
    const result = await announcementService.setStatus(id, 'cancelled');
    res.json(success(result, '公告已下线'));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const result = await announcementService.remove(id);
    res.json(success(result, '公告已删除'));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, publish, cancel, remove };
