'use strict';

const operationLogService = require('../services/operation-log.service');
const { paginated } = require('../../common/utils/response');

/**
 * 操作日志列表
 * GET /api/admin/operation-logs
 */
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 20, keyword, module, action, startDate, endDate } = req.query;
    const result = await operationLogService.list({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      keyword,
      module,
      action,
      startDate,
      endDate,
    });
    res.json(paginated(result.list, result.total, result.page, result.pageSize));
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
