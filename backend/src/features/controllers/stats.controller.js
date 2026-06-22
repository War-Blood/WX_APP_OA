'use strict';

const statsService = require('../services/stats.service');
const coreStatsService = require('../../core/services/stats.service');
const { success, paginated } = require('../../common/utils/response');

/**
 * 数据统计控制器
 * @module statsController
 */

/**
 * 首页统计数据
 * POST /api/stats/home
 * 根据当前用户角色返回不同的统计数据
 */
async function home(req, res, next) {
  try {
    const userId = req.user.userId;
    const { role } = req.body;

    const stats = await statsService.getHomeStats(userId, role || req.user.role);

    res.json(success(stats));
  } catch (err) {
    next(err);
  }
}

/**
 * 最近动态列表
 * POST /api/stats/activities
 * 从审批操作、日报提交、系统消息中聚合动态，分页返回
 */
async function activities(req, res, next) {
  try {
    const userId = req.user.userId;
    const { page = 1, pageSize = 20 } = req.body;

    const result = await statsService.getActivities(userId, Number(page), Number(pageSize));

    res.json(paginated(result.list, result.total, result.page, result.pageSize));
  } catch (err) {
    next(err);
  }
}

/**
 * 个人中心统计
 * POST /api/stats/profile
 * P1 优先级，返回个人累计数据
 */
async function profile(req, res, next) {
  try {
    const userId = req.user.userId;

    const stats = await statsService.getProfileStats(userId);

    res.json(success(stats));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/stats/reportStats
 * 日报统计看板
 */
async function reportStats(req, res, next) {
  try {
    const stats = await statsService.getReportStats();
    res.json(success(stats));
  } catch (err) { next(err); }
}

/**
 * 月度每日提交人次
 * POST /api/stats/daily-counts
 */
async function dailyCounts(req, res, next) {
  try {
    const { month } = req.body;
    const result = await coreStatsService.getDailyCounts(month);
    res.json(success(result));
  } catch (err) { next(err); }
}

/**
 * 项目进展看板
 * POST /api/stats/project-progress
 */
async function projectProgress(req, res, next) {
  try {
    const { month } = req.body;
    const result = await coreStatsService.getProjectProgress(month);
    res.json(success(result));
  } catch (err) { next(err); }
}

/**
 * 人员工作类型分布
 * POST /api/stats/worker-work-types
 */
async function workerWorkTypes(req, res, next) {
  try {
    const { month } = req.body;
    const result = await coreStatsService.getWorkerWorkTypes(month);
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = {
  home,
  activities,
  profile,
  reportStats,
  dailyCounts,
  projectProgress,
  workerWorkTypes,
};
