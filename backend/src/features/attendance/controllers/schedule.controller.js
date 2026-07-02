'use strict';

const scheduleService = require('../services/schedule.service');
const { success, paginated } = require('../../../common/utils/response');
const { ValidationError } = require('../../../common/utils/errors');

async function list(req, res, next) {
  try {
    const { startDate, endDate, departmentId, userId, page = 1, pageSize = 100 } = req.body;
    if (!startDate || !endDate) throw new ValidationError('起止日期不能为空');
    const result = await scheduleService.list({ startDate, endDate, departmentId, userId, page, pageSize });
    res.json(paginated(result.list, result.total, result.page, result.pageSize));
  } catch (err) { next(err); }
}

async function upsert(req, res, next) {
  try {
    const { userId, scheduleDate, status, note } = req.body;
    if (!userId || !scheduleDate || !status) throw new ValidationError('userId/scheduleDate/status 必填');
    const result = await scheduleService.upsert({ userId, scheduleDate, status, note, createdBy: req.user.userId });
    res.json(success(result));
  } catch (err) { next(err); }
}

async function batch(req, res, next) {
  try {
    const { userIds, startDate, endDate, status, note, weekdaysOnly } = req.body;
    if (!userIds?.length || !startDate || !endDate || !status) throw new ValidationError('参数不完整');
    const result = await scheduleService.batch({ userIds, startDate, endDate, status, note, weekdaysOnly, createdBy: req.user.userId });
    res.json(success(result));
  } catch (err) { next(err); }
}

async function mySchedule(req, res, next) {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) throw new ValidationError('起止日期不能为空');
    const rows = await scheduleService.mySchedule({ userId: req.user.userId, startDate, endDate });
    res.json(success(rows));
  } catch (err) { next(err); }
}

module.exports = { list, upsert, batch, mySchedule };