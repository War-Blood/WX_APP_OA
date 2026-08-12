'use strict';

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, requireRole } = require('../../common/middleware/auth');

/**
 * 日报路由 v2.0
 * 所有路由需要登录认证
 */

// 管理员权限中间件
const adminAuth = [authenticate, requireRole('admin', 'superadmin')];

// ==============================
// 基础 CRUD（所有用户）
// ==============================

// POST /api/report/list — 日报列表（分页+筛选）
router.post('/list', authenticate, reportController.list);

// POST /api/report/detail — 日报详情
router.post('/detail', authenticate, reportController.detail);

// POST /api/report/submit — 提交日报（v2.0 改造，支持三种 reportType）
router.post('/submit', authenticate, reportController.submit);

// POST /api/report/draft — 保存草稿
router.post('/draft', authenticate, reportController.saveDraft);

// GET /api/report/draft — 获取草稿
router.get('/draft', authenticate, reportController.getDraft);

// POST /api/report/delete — 删除日报（软删除，可恢复）
router.post('/delete', authenticate, reportController.deleteReport);

// POST /api/report/restore — 恢复已删除日报
router.post('/restore', authenticate, reportController.restoreReport);

// POST /api/report/deleted-list — 回收站列表（仅管理员）
router.post('/deleted-list', ...adminAuth, reportController.listDeleted);

// POST /api/report/purge — 彻底删除回收站记录（仅管理员，不可恢复）
router.post('/purge', ...adminAuth, reportController.purgeReport);

// POST /api/report/update — 管理员编辑公出日志（仅 admin+）
router.post('/update', ...adminAuth, reportController.update);

// ==============================
// 代填检测（v2.0 新增）
// ==============================

// POST /api/report/check-duplicate — 检查当日是否已被代填
router.post('/check-duplicate', authenticate, reportController.checkDuplicate);

// POST /api/report/today-status — 查询当日日报状态（未提交/草稿/已提交/被代填）
router.post('/today-status', authenticate, reportController.todayStatus);

// ==============================
// 补公出日志审核（v2.0 新增，仅 admin+）
// ==============================

// POST /api/report/pending-reviews — 补公出待审核列表
router.post('/pending-reviews', ...adminAuth, reportController.pendingReviews);

// POST /api/report/supplement-review — 补公出审核判定
router.post('/supplement-review', ...adminAuth, reportController.supplementReview);

// ==============================
// 统计看板（v2.0 新增，user 范围全员可用，all/project 仅 admin+）
// ==============================
// 注意：stats 接口按 scope 区分权限，controller 层不做限制，由前端按角色展示不同 Tab
router.post('/stats', authenticate, reportController.stats);

// ==============================
// 管理层看板（v2.0 新增，仅 admin+）
// ==============================

// POST /api/report/daily-status — 全员当日状态
router.post('/daily-status', ...adminAuth, reportController.dailyStatus);

// POST /api/report/tomorrow-status — 明日计划状态
router.post('/tomorrow-status', ...adminAuth, reportController.tomorrowStatus);

// POST /api/report/monthly-summary — 月度工作占比（管理员看全员，员工看自己）
router.post('/monthly-summary', authenticate, reportController.monthlySummary);

// ==============================
// 同组日志（v2.0 新增）
// ==============================

// POST /api/report/team-logs — 同组日志列表
router.post('/team-logs', authenticate, reportController.teamLogs);

// ==============================
// 旧版兼容
// ==============================

// GET /api/report/workerList — 作业人员名单（去重）
router.get('/workerList', authenticate, reportController.workerList);

// POST /api/report/workerStats — 人员统计看板
router.post('/workerStats', authenticate, reportController.workerStats);

// POST /api/report/export — 导出CSV
router.post('/export', authenticate, reportController.exportCSV);

// POST /api/report/export-attendance — 导出月度考勤矩阵
router.post('/export-attendance', authenticate, reportController.exportAttendance);

// POST /api/report/export-wecom-sheet — 导出到企业微信智能表格（仅 admin+）
router.post('/export-wecom-sheet', ...adminAuth, reportController.exportToWecomSheet);

// POST /api/report/export-status-board — 导出员工月度状态看板
router.post('/export-status-board', authenticate, reportController.exportStatusBoard);

// POST /api/report/schedule-preview — 获取月度排班预览（用于导出前审核）
router.post('/schedule-preview', authenticate, reportController.schedulePreview);

module.exports = router;
