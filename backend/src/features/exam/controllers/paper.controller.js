'use strict';

const paperService = require('../services/paper.service');
const { success, paginated } = require('../../../../common/utils/response');

async function list(req, res, next) {
  try {
    const { status, page = 1, pageSize = 20 } = req.body;
    const result = await paperService.list({ status, page: Number(page), pageSize: Number(pageSize) });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = { ...req.body, createdBy: req.user.userId };
    const result = await paperService.create(data);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id, ...data } = req.body;
    const result = await paperService.update(id, data);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = req.body;
    const result = await paperService.remove(id);
    res.json(success(result, '已删除'));
  } catch (err) { next(err); }
}

async function publish(req, res, next) {
  try {
    const { id } = req.body;
    const result = await paperService.publish(id);
    res.json(success(result, '已发布'));
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove, publish };
