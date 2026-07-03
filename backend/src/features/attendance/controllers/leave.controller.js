'use strict';

const leaveService = require('../services/leave.service');
const tripService = require('../services/trip.service');
const { success, paginated } = require('../../../common/utils/response');
const { ValidationError } = require('../../../common/utils/errors');

// ===== 请假 =====

async function apply(req, res, next) {
  try {
    const { leaveSubtype, startDate, endDate, reason } = req.body;
    if (!startDate || !endDate) throw new ValidationError('起止日期不能为空');
    const result = await leaveService.apply({ applicantId: req.user.userId, leaveSubtype, startDate, endDate, reason });
    res.json(success(result));
  } catch (err) { next(err); }
}

async function myList(req, res, next) {
  try {
    const { requestType, status, page = 1, pageSize = 10 } = req.body;
    const result = await leaveService.myList({ applicantId: req.user.userId, requestType, status, page, pageSize });
    res.json(paginated(result.list, result.total, result.page, result.pageSize));
  } catch (err) { next(err); }
}

async function detail(req, res, next) {
  try {
    const { requestId } = req.body;
    if (!requestId) throw new ValidationError('requestId 不能为空');
    const result = await leaveService.detail(requestId);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    const { requestId } = req.body;
    if (!requestId) throw new ValidationError('requestId 不能为空');
    const result = await leaveService.cancel(requestId, req.user.userId);
    res.json(success(result));
  } catch (err) { next(err); }
}

// ===== 出差打卡 =====

async function startTrip(req, res, next) {
  try {
    const { reason } = req.body;
    const result = await tripService.startTrip({ applicantId: req.user.userId, reason });
    res.json(success(result));
  } catch (err) { next(err); }
}

async function endTrip(req, res, next) {
  try {
    const { requestId, reason } = req.body;
    const result = await tripService.endTrip({ applicantId: req.user.userId, requestId, reason });
    res.json(success(result));
  } catch (err) { next(err); }
}

async function updateRequest(req, res, next) {
  try {
    const { requestId, leaveSubtype, startDate, endDate, reason } = req.body;
    if (!requestId) throw new ValidationError('requestId 不能为空');
    if (!startDate || !endDate) throw new ValidationError('起止日期不能为空');
    const result = await leaveService.updateRequest(requestId, req.user.userId, { leaveSubtype, startDate, endDate, reason });
    res.json(success(result, '修改成功'));
  } catch (err) { next(err); }
}

async function deleteRequest(req, res, next) {
  try {
    const { requestId } = req.body;
    if (!requestId) throw new ValidationError('requestId 不能为空');
    const result = await leaveService.deleteRequest(requestId);
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = { apply, myList, detail, cancel, startTrip, endTrip, updateRequest, deleteRequest };