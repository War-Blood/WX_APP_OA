'use strict';

const summaryService = require('../services/summary.service');
const { success, paginated } = require('../../../common/utils/response');
const { ValidationError } = require('../../../common/utils/errors');

async function list(req, res, next) {
  try {
    const { startDate, endDate, departmentId, userId, page = 1, pageSize = 50 } = req.body;
    if (!startDate || !endDate) throw new ValidationError('起止日期不能为空');
    const result = await summaryService.list({ startDate, endDate, departmentId, userId, page, pageSize });
    res.json(paginated(result.list, result.total, result.page, result.pageSize));
  } catch (err) { next(err); }
}

async function exportExcel(req, res, next) {
  try {
    const { startDate, endDate, departmentId, userId } = req.body;
    if (!startDate || !endDate) throw new ValidationError('起止日期不能为空');
    const { buffer, filename } = await summaryService.exportExcel({ startDate, endDate, departmentId, userId });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
  } catch (err) { next(err); }
}

async function mySummary(req, res, next) {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) throw new ValidationError('起止日期不能为空');
    const result = await summaryService.mySummary({ userId: req.user.userId, startDate, endDate });
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = { list, exportExcel, mySummary };
