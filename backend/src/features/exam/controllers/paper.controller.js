'use strict';

const paperService = require('../services/paper.service');
const { success, paginated } = require('../../../common/utils/response');

/**
 * 试卷管理控制器（企业内部考核）
 */

/** 试卷列表(管理员) */
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 20, status } = req.body;
    const result = await paperService.list({ status, page, pageSize });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

/** 我可参加的试卷列表(已发布+窗口内+范围匹配) */
async function available(req, res, next) {
  try {
    const result = await paperService.available(req.user.userId);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 新建试卷 */
async function create(req, res, next) {
  try {
    const result = await paperService.create({ ...req.body, createdBy: req.user.userId });
    res.json(success(result, '试卷已创建'));
  } catch (err) { next(err); }
}

/** 编辑试卷 */
async function update(req, res, next) {
  try {
    const { id, ...data } = req.body;
    const result = await paperService.update(id, data);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 删除试卷 */
async function remove(req, res, next) {
  try {
    const { id } = req.body;
    const result = await paperService.remove(id);
    res.json(success(result, '已删除'));
  } catch (err) { next(err); }
}

/** 发布试卷 */
async function publish(req, res, next) {
  try {
    const { id } = req.body;
    const result = await paperService.publish(id);
    res.json(success(result, '已发布'));
  } catch (err) { next(err); }
}

/** 归档试卷 */
async function archive(req, res, next) {
  try {
    const { id } = req.body;
    const result = await paperService.archive(id);
    res.json(success(result, '已归档'));
  } catch (err) { next(err); }
}

/** 克隆试卷为草稿 */
async function clone(req, res, next) {
  try {
    const { id } = req.body;
    const result = await paperService.clone(id);
    res.json(success(result, '已克隆为草稿'));
  } catch (err) { next(err); }
}

/** 试卷详情(只读预览) */
async function detail(req, res, next) {
  try {
    const { id } = req.body;
    const result = await paperService.detail(id);
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = { list, available, create, update, remove, publish, archive, clone, detail };