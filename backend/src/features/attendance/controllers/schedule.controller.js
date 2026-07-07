'use strict';

const scheduleService = require('../services/schedule.service');
const { success } = require('../../../common/utils/response');
const { ValidationError } = require('../../../common/utils/errors');

async function preview(req, res, next) {
  try {
    const { month } = req.body;
    if (!month) throw new ValidationError('月份不能为空');
    const result = await scheduleService.preview(month);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function saveMonth(req, res, next) {
  try {
    const { month, workDays } = req.body;
    if (!month || !Array.isArray(workDays)) throw new ValidationError('month/workDays 必填');
    const result = await scheduleService.saveMonth(month, workDays);
    res.json(success(result));
  } catch (err) { next(err); }
}

async function getRules(req, res, next) {
  try {
    const rules = await scheduleService.getRules();
    res.json(success(rules));
  } catch (err) { next(err); }
}

async function saveRule(req, res, next) {
  try {
    const { id, name, weekConfig, altWeekConfig, alternating, isDefault } = req.body;
    if (!name || !weekConfig) throw new ValidationError('名称和星期配置不能为空');
    const result = await scheduleService.saveRule({ id: id || null, name, weekConfig, altWeekConfig, alternating: !!alternating, isDefault: !!isDefault, createdBy: req.user.userId });
    res.json(success(result));
  } catch (err) { next(err); }
}

async function applyRule(req, res, next) {
  try {
    const { ruleId, startDate, endDate } = req.body;
    if (!ruleId || !startDate || !endDate) throw new ValidationError('ruleId/startDate/endDate 不能为空');
    const result = await scheduleService.applyRule({ ruleId, startDate, endDate });
    res.json(success(result));
  } catch (err) { next(err); }
}

async function clearSchedules(req, res, next) {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) throw new ValidationError('起止日期不能为空');
    const result = await scheduleService.clearSchedules(startDate, endDate);
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = { preview, saveMonth, mySchedule, getRules, saveRule, applyRule, clearSchedules };

async function mySchedule(req, res, next) {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) throw new ValidationError('起止日期不能为空');
    const rows = await scheduleService.mySchedule({ startDate, endDate });
    res.json(success(rows));
  } catch (err) { next(err); }
}
