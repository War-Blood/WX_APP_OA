'use strict';

const wpsService = require('../services/wps.service');
const { success, fail } = require('../../common/utils/response');

/**
 * GET /api/wps/reports?key=xxx
 * 返回审核通过的日报数据（纯数组 JSON），供 WPS 表格引用
 */
async function getReports(req, res, next) {
  try {
    const result = await wpsService.getReports();
    // WPS 表格需要直接的数组格式，不要外层包装
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/wps/reports.csv?key=xxx
 * 返回审核通过的日报数据（CSV），供 WPS 多维表格导入
 */
async function getReportsCSV(req, res, next) {
  try {
    const csv = await wpsService.getReportsCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=reports.csv');
    res.send('\uFEFF' + csv); // BOM for Excel/WPS
  } catch (err) {
    next(err);
  }
}

module.exports = { getReports, getReportsCSV };
