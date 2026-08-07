'use strict';

const favoriteService = require('../services/favorite.service');
const { success, paginated } = require('../../../common/utils/response');

/**
 * 收藏控制器
 */

/** 收藏/取消收藏 */
async function toggle(req, res, next) {
  try {
    const { questionId } = req.body;
    const result = await favoriteService.toggle(req.user.userId, questionId);
    res.json(success(result, result.favorited ? '已收藏' : '已取消收藏'));
  } catch (err) { next(err); }
}

/** 我的收藏列表 */
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.body;
    const result = await favoriteService.list(req.user.userId, { page, pageSize });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

module.exports = { toggle, list };
