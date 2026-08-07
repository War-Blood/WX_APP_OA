'use strict';

const wrongService = require('../services/wrong.service');
const { success, paginated } = require('../../../common/utils/response');

/**
 * 错题本控制器
 */

/** 我的错题列表 */
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.body;
    const result = await wrongService.list(req.user.userId, { page, pageSize });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

/** 移除错题 */
async function remove(req, res, next) {
  try {
    const { questionId } = req.body;
    const result = await wrongService.remove(req.user.userId, questionId);
    res.json(success(result, '已移除'));
  } catch (err) { next(err); }
}

module.exports = { list, remove };
