'use strict';

const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/compliance.controller');
const { authenticate, requireRole } = require('../../../common/middleware/auth');

// 管理员接口（支持admin和superadmin角色）
router.post('/biz-trip', authenticate, requireRole('admin', 'superadmin'), complianceController.setBizTripStatus);
router.put('/biz-trip/:id/end', authenticate, requireRole('admin', 'superadmin'), complianceController.endBizTrip);
router.get('/biz-trip/list', authenticate, requireRole('admin', 'superadmin'), complianceController.getBizTripList);

router.get('/missing-reports', authenticate, requireRole('admin', 'superadmin'), complianceController.getMissingReports);
router.post('/missing-reports/:id/review', authenticate, requireRole('admin', 'superadmin'), complianceController.reviewMissingReport);

router.put('/timeliness/:id', authenticate, requireRole('admin', 'superadmin'), complianceController.updateTimeliness);

router.get('/stats/dashboard', authenticate, requireRole('admin', 'superadmin'), complianceController.getDashboard);

// 员工接口
router.get('/my-compliance', authenticate, complianceController.getMyCompliance);
router.get('/biz-trip/check-status', authenticate, complianceController.checkMyBizTripStatus);

// 测试接口(仅开发环境)
if (process.env.NODE_ENV === 'development') {
  router.get('/test/send-reminder', authenticate, requireRole('admin'), complianceController.testSendReminder);
}

module.exports = router;
