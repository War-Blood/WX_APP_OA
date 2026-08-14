'use strict';

const questionService = require('../services/question.service');
const logger = require('../../../common/utils/logger');
const { success, paginated } = require('../../../common/utils/response');

/**
 * 题库管理控制器
 */

/** 题库列表 */
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 20, categoryId, type, keyword } = req.body;
    const result = await questionService.list({ categoryId, type, keyword, page, pageSize });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

/** 新增题目 */
async function create(req, res, next) {
  try {
    const result = await questionService.create({ ...req.body, createdBy: req.user.userId });
    res.json(success(result, '题目已创建'));
  } catch (err) { next(err); }
}

/** 编辑题目 */
async function update(req, res, next) {
  try {
    const { id, ...data } = req.body;
    const result = await questionService.update(id, data);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 删除题目 */
async function remove(req, res, next) {
  try {
    const { id } = req.body;
    const result = await questionService.remove(id);
    res.json(success(result, '已删除'));
  } catch (err) { next(err); }
}

/** 批量导入 */
async function batchImport(req, res, next) {
  try {
    const { questions, baseRow = 2 } = req.body;
    const result = await questionService.batchImport(questions, req.user.userId, Number(baseRow) || 2);
    logger.info('题库批量导入', {
      module: 'ANSWER',
      userId: req.user.userId,
      success: result.success,
      failed: result.failed,
    });
    res.json(success(result, `成功 ${result.success} 条，失败 ${result.failed} 条`));
  } catch (err) { next(err); }
}

module.exports = { list, create, update, remove, batchImport };
