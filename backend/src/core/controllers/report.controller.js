'use strict';

const reportService = require('../services/report.service');
const { success, paginated } = require('../../common/utils/response');

/**
 * 日报控制器
 */

/**
 * 日报列表（分页+筛选）
 * POST /api/report/list
 */
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 50, status, startDate, endDate, keyword } = req.body;
    const role = req.user.role;
    // admin/superadmin 看全部，普通用户只看自己的
    const userId = (role === 'admin' || role === 'superadmin') ? 0 : req.user.userId;

    const { list: reportList, total } = await reportService.list(userId, {
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      startDate,
      endDate,
      keyword,
    });

    res.json(paginated(reportList, total, Number(page), Number(pageSize)));
  } catch (err) {
    next(err);
  }
}

/**
 * 日报详情
 * POST /api/report/detail
 */
async function detail(req, res, next) {
  try {
    const { id } = req.body;
    const report = await reportService.detail(id);

    res.json(success(report));
  } catch (err) {
    next(err);
  }
}

/**
 * 提交日报
 * POST /api/report/submit
 * 接收完整 formData（包含所有字段）
 */
async function submit(req, res, next) {
  try {
    const { formData, reportDate, status } = req.body;
    const userId = req.user.userId;

    const report = await reportService.submit({
      userId,
      reportDate: reportDate || formData?.date,
      formData: formData || req.body,  // 兼容两种传参方式
      status: status || 'pending',
    });

    res.json(success(report));
  } catch (err) {
    next(err);
  }
}

/**
 * 保存草稿
 * POST /api/report/draft
 */
async function saveDraft(req, res, next) {
  try {
    const { formData, reportDate } = req.body;
    const userId = req.user.userId;

    const report = await reportService.submit({
      userId,
      reportDate: reportDate || formData?.date,
      formData,
      status: 'draft',
    });

    res.json(success(report));
  } catch (err) {
    next(err);
  }
}

/**
 * 获取草稿
 * GET /api/report/draft
 * 参数: { reportDate }
 * 返回: 草稿数据或 null
 */
async function getDraft(req, res, next) {
  try {
    let { reportDate } = req.query;
    // 兼容前端错误传参 {reportDate: "..."} 和正确传参 "2026-06-01"
    try { const parsed = JSON.parse(reportDate); reportDate = parsed.reportDate || reportDate; } catch {}
    const userId = req.user.userId;

    const draft = await reportService.getDraft(userId, reportDate);
    res.json(success(draft));
  } catch (err) {
    next(err);
  }
}

/**
 * 删除日报
 * POST /api/report/delete
 * 只允许删除草稿(draft)或已驳回(rejected)的日报
 */
async function deleteReport(req, res, next) {
  try {
    const { id } = req.body;
    const role = req.user.role;
    const userId = (role === 'admin' || role === 'superadmin') ? 0 : req.user.userId;

    await reportService.deleteReport(id, userId);
    res.json(success(null, '删除成功'));
  } catch (err) {
    next(err);
  }
}

/**
 * 获取作业人员名单（去重）
 * GET /api/report/workerList
 */
async function workerList(req, res, next) {
  try {
    const names = await reportService.getWorkerList();
    res.json(success(names));
  } catch (err) { next(err); }
}

/**
 * 人员统计看板
 * POST /api/report/workerStats
 */
async function workerStats(req, res, next) {
  try {
    const { page = 1, pageSize = 20, keyword } = req.body;
    const result = await reportService.getWorkerStats({ page: Number(page), pageSize: Number(pageSize), keyword });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

/**
 * 导出 CSV
 * POST /api/report/export
 */
async function exportCSV(req, res, next) {
  try {
    const { status, startDate, endDate, keyword, worker } = req.body;
    const csv = await reportService.exportCSV({ status, startDate, endDate, keyword, worker });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
    res.send('\uFEFF' + csv); // BOM for Excel Chinese
  } catch (err) { next(err); }
}

module.exports = { list, detail, submit, saveDraft, getDraft, deleteReport, workerList, workerStats, exportCSV };
