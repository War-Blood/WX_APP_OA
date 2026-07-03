'use strict';

const express = require('express');
const router = express.Router();
const { authenticate } = require('../../../common/middleware/auth');
const { requireRole } = require('../../../common/middleware/auth');
const scheduleController = require('../controllers/schedule.controller');
const leaveController = require('../controllers/leave.controller');
const summaryController = require('../controllers/summary.controller');

// ===== 排班管理（管理员） =====
router.post('/schedule/list', authenticate, requireRole('admin', 'superadmin'), scheduleController.list);
router.post('/schedule/upsert', authenticate, requireRole('admin', 'superadmin'), scheduleController.upsert);
router.post('/schedule/batch', authenticate, requireRole('admin', 'superadmin'), scheduleController.batch);
router.post('/schedule/delete', authenticate, requireRole('admin', 'superadmin'), scheduleController.deleteSchedule);
// ===== 个人排班（登录用户） =====
router.post('/schedule/my-schedule', authenticate, scheduleController.mySchedule);

// ===== 请假申请（登录用户） =====
router.post('/leave/apply', authenticate, leaveController.apply);
router.post('/leave/my-list', authenticate, leaveController.myList);
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
