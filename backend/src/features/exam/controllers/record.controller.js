'use strict';

const recordService = require('../services/record.service');
const rankService = require('../services/rank.service');
const { success, paginated } = require('../../../common/utils/response');

/**
 * 答题记录控制器 — 我的/全员/详情/排行/导出/统计
 */

/** 我的答题记录 */
async function myRecords(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.body;
    const result = await recordService.myRecords(req.user.userId, { page, pageSize });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

/** 全员答题记录(管理员) */
async function allRecords(req, res, next) {
  try {
    const { page = 1, pageSize = 20, keyword, categoryId, mode } = req.body;
    const result = await recordService.allRecords({ keyword, categoryId, mode, page, pageSize });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

/** 记录详情 */
async function detail(req, res, next) {
  try {
    const { recordId } = req.body;
    const result = await recordService.detail(recordId, req.user.userId);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 排行榜 */
async function rank(req, res, next) {
  try {
    const { categoryId } = req.body;
    const result = await rankService.rank(categoryId);
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 导出成绩 CSV(管理员) */
async function exportRecords(req, res, next) {
  try {
    const { categoryId, keyword } = req.body;
    const { filename, csv } = await recordService.exportRecords({ categoryId, keyword });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) { next(err); }
}

/** 统计看板(管理员) */
async function overview(req, res, next) {
  try {
    const { categoryId } = req.body;
    const result = await recordService.overview({ categoryId });
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = { myRecords, allRecords, detail, rank, exportRecords, overview };
