'use strict';

const questionService = require('../services/question.service');
const { success, paginated } = require('../../../common/utils/response');

async function list(req, res, next) {
  try {
    const { categoryId, type, keyword, page = 1, pageSize = 20 } = req.body;
    const result = await questionService.list({ categoryId, type, keyword, page: Number(page), pageSize: Number(pageSize) });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = { ...req.body, createdBy: req.user.userId };
    const result = await questionService.create(data);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id, ...data } = req.body;
    const result = await questionService.update(id, data);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = req.body;
    const result = await questionService.remove(id);
    res.json(success(result, '已删除'));
  } catch (err) { next(err); }
}

async function batchImport(req, res, next) {
  try {
    const { questions } = req.body;
    const result = await questionService.batchImport(questions, req.user.userId);
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove, batchImport };
