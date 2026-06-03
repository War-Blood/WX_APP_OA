'use strict';

const router = require('express').Router();
const wpsController = require('../controllers/wps.controller');
const { fail } = require('../../common/utils/response');

/**
 * API Key 鉴权中间件
 */
function apiKeyAuth(req, res, next) {
  const key = req.query.key || req.headers['x-api-key'];
  const validKey = process.env.WPS_API_KEY;

  if (!validKey) {
    return res.status(200).json(fail(500, 'WPS API 未配置'));
  }
  if (key !== validKey) {
    return res.status(200).json(fail(401, '无效的 API 密钥'));
  }
  next();
}

/**
 * WPS 数据接口
 *   GET /api/wps/reports?key=xxx  — 获取已审核通过的日报数据
 */
router.get('/wps/reports', apiKeyAuth, wpsController.getReports);
router.get('/wps/reports.csv', apiKeyAuth, wpsController.getReportsCSV);

module.exports = router;
