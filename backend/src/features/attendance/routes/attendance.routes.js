'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../common/middleware/auth');
const { requireRole } = require('../../../common/middleware/auth');
const scheduleController = require('../controllers/schedule.controller');
const leaveController = require('../controllers/leave.controller');
const summaryController = require('../controllers/summary.controller');

// ===== 排班管理（管理员） =====
router.post('/schedule/preview', authenticate, requireRole('admin', 'superadmin'), scheduleController.preview);
router.post('/schedule/save-month', authenticate, requireRole('admin', 'superadmin'), scheduleController.saveMonth);
router.post('/schedule/rules', authenticate, requireRole('admin', 'superadmin'), scheduleController.getRules);
router.post('/schedule/rules/save', authenticate, requireRole('admin', 'superadmin'), scheduleController.saveRule);
router.post('/schedule/rules/apply', authenticate, requireRole('admin', 'superadmin'), scheduleController.applyRule);
router.post('/schedule/clear', authenticate, requireRole('admin', 'superadmin'), scheduleController.clearSchedules);
// ===== 个人排班（登录用户） =====
router.post('/schedule/my-schedule', authenticate, scheduleController.mySchedule);

// ===== 请假申请（登录用户） =====
router.post('/leave/apply', authenticate, leaveController.apply);
router.post('/leave/my-list', authenticate, leaveController.myList);
router.post('/leave/all-list', authenticate, requireRole('admin', 'superadmin'), leaveController.adminList);
router.post('/leave/detail', authenticate, leaveController.detail);
router.post('/leave/cancel', authenticate, leaveController.cancel);
router.post('/leave/update', authenticate, leaveController.updateRequest);
router.post('/leave/delete', authenticate, requireRole('admin', 'superadmin'), leaveController.deleteRequest);

// ===== 出差打卡（登录用户） =====
router.post('/biz-trip/start', authenticate, leaveController.startTrip);
router.post('/biz-trip/end', authenticate, leaveController.endTrip);

// ===== 考勤汇总（管理员） =====
router.post('/summary/list', authenticate, requireRole('admin', 'superadmin'), summaryController.list);
router.post('/summary/export', authenticate, requireRole('admin', 'superadmin'), summaryController.exportExcel);
// ===== 个人考勤汇总（登录用户） =====
router.post('/summary/my-summary', authenticate, summaryController.mySummary);

module.exports = router;
