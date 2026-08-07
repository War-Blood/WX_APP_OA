'use strict';

const categoryService = require('../services/category.service');
const { success } = require('../../../common/utils/response');

/**
 * 分类管理控制器
 */

/** 分类树列表 */
async function list(req, res, next) {
  try {
    const result = await categoryService.list();
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 新增分类 */
async function create(req, res, next) {
  try {
    const result = await categoryService.create(req.body);
    res.json(success(result, '分类已创建'));
  } catch (err) { next(err); }
}

/** 编辑分类 */
async function update(req, res, next) {
  try {
    const { id, ...data } = req.body;
    const result = await categoryService.update(id, data);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 删除分类 */
async function remove(req, res, next) {
  try {
    const { id } = req.body;
    const result = await categoryService.remove(id);
    res.json(success(result, '已删除'));
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove };
