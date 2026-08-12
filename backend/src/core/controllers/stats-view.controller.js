'use strict';

const statsViewService = require('../services/stats-view.service');
const { ValidationError } = require('../../common/utils/errors');
const { success } = require('../../common/utils/response');

/**
 * 创建视图（admin+）
 * POST /api/stats/views
 */
async function create(req, res, next) {
  try {
    const result = await statsViewService.createView(req.body, req.user.userId);
    res.json(success(result, '视图已创建'));
  } catch (err) { next(err); }
}

/**
 * 当前角色可见视图列表（登录）
 * GET /api/stats/views?statKey=daily
 */
async function list(req, res, next) {
  try {
    const { statKey } = req.query;
    const result = await statsViewService.listViews(statKey, req.user.role, req.user.userId);
    res.json(success(result));
  } catch (err) { next(err); }
}

/**
 * 视图详情（登录，不可见 403）
 * GET /api/stats/views/:id
 */
async function get(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) throw new ValidationError('id 不能为空');
    const result = await statsViewService.getView(id, req.user.role, req.user.userId);
    res.json(success(result));
  } catch (err) { next(err); }
}

/**
 * 更新视图（admin+，锁定需先解锁）
 * PUT /api/stats/views/:id
 */
async function update(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) throw new ValidationError('id 不能为空');
    await statsViewService.updateView(id, req.body, req.user.role);
    res.json(success(null, '视图已更新'));
  } catch (err) { next(err); }
}

/**
 * 锁定视图（admin+）
 * POST /api/stats/views/:id/lock
 */
async function lock(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) throw new ValidationError('id 不能为空');
    await statsViewService.setLocked(id, true, req.user.role);
    res.json(success(null, '视图已锁定'));
  } catch (err) { next(err); }
}

/**
 * 解锁视图（admin+）
 * POST /api/stats/views/:id/unlock
 */
async function unlock(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) throw new ValidationError('id 不能为空');
    await statsViewService.setLocked(id, false, req.user.role);
    res.json(success(null, '视图已解锁'));
  } catch (err) { next(err); }
}

/**
 * 删除视图（admin+）
 * DELETE /api/stats/views/:id
 */
async function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!id) throw new ValidationError('id 不能为空');
    await statsViewService.deleteView(id, req.user.role);
    res.json(success(null, '视图已删除'));
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

module.exports = { create, list, get, update, lock, unlock, remove, fields };
