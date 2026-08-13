'use strict';

const statsViewService = require('../services/stats-view.service');
const { ValidationError } = require('../../common/utils/errors');
const { success } = require('../../common/utils/response');

/**
 * 保存某统计页的唯一视图（UPSERT，admin+）
 * POST /api/stats/views  body: { statKey, conditions }
 */
async function save(req, res, next) {
  try {
    const { statKey, conditions, visibility } = req.body;
    if (!statKey) throw new ValidationError('statKey 必填');
    await statsViewService.upsertView({ statKey, conditions, visibility }, req.user.userId);
    res.json(success(null, '视图已保存'));
  } catch (err) { next(err); }
}

/**
 * 获取某统计页的唯一视图（登录）
 * GET /api/stats/views?statKey=daily
 */
async function get(req, res, next) {
  try {
    const { statKey } = req.query;
    const result = statKey ? await statsViewService.getViewByStatKey(statKey) : null;
    // 操作审计：记录弹窗打开时读到的视图内容
    if (statKey) {
      await statsViewService.logViewOp({
        statKey,
        action: 'read',
        payload: { filter: result ? result.filter : null },
        userId: req.user.userId,
      });
    }
    res.json(success(result));
  } catch (err) { next(err); }
}

/**
 * 查询统计视图操作记录（admin+）
 * GET /api/stats/views/ops?statKey=&limit=
 */
async function ops(req, res, next) {
  try {
    const { statKey, limit } = req.query;
    const list = await statsViewService.listViewOps({
      statKey: statKey || undefined,
      limit: Math.min(Number(limit) || 50, 200),
    });
    res.json(success(list));
  } catch (err) { next(err); }
}

/**
 * 动态获取可筛选字段（登录）
 * GET /api/stats/views/fields
 */
async function fields(req, res, next) {
  try {
    res.json(success(statsViewService.getFilterFields()));
  } catch (err) { next(err); }
}

module.exports = { save, get, fields, ops };
