'use strict';

const express = require('express');
const path = require('path');
const router = express.Router();
const statsController = require('../controllers/stats.controller');
const statsViewController = require('../../core/controllers/stats-view.controller');
const { authenticate, requireRole } = require('../../common/middleware/auth');

const adminAuth = [authenticate, requireRole('admin', 'superadmin')];

const fs = require('fs');

// 中国地图 GeoJSON（后端同源托管，避免依赖外网 CDN）
const chinaGeoPath = path.join(__dirname, '../../../data/geo/china.json');
router.get('/geo/china', authenticate, (req, res) => {
  fs.readFile(chinaGeoPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(404).json({ code: 1002, message: '地图资源缺失', data: null });
    }
    try {
      const geoJson = JSON.parse(data);
      res.json({ code: 0, message: 'success', data: geoJson });
    } catch (parseErr) {
      res.status(500).json({ code: 1003, message: '地图资源解析失败', data: null });
    }
  });
});

/**
 * 数据统计路由
 * 所有路由需要登录认证
 */

// POST /api/stats/home — 首页统计数据
router.post('/stats/home', authenticate, statsController.home);

// POST /api/stats/activities — 最近动态列表（分页）
router.post('/stats/activities', authenticate, statsController.activities);

// POST /api/stats/missing-details — 未填写明细
router.post('/stats/missing-details', authenticate, statsController.missingDetails);

// POST /api/stats/profile — 个人中心统计
router.post('/stats/profile', authenticate, statsController.profile);

// POST /api/stats/reportStats — 日报统计看板
router.post('/stats/reportStats', authenticate, statsController.reportStats);

// POST /api/stats/daily-counts — 月度每日提交人次
router.post('/stats/daily-counts', authenticate, statsController.dailyCounts);

// POST /api/stats/project-progress — 项目进展看板
router.post('/stats/project-progress', authenticate, statsController.projectProgress);

// POST /api/stats/worker-work-types — 人员工作类型分布
router.post('/stats/worker-work-types', authenticate, statsController.workerWorkTypes);

// POST /api/stats/area-distribution — 省份人员分布
router.post('/stats/area-distribution', authenticate, statsController.areaDistribution);

// POST /api/stats/province-workers — 省份下钻人员列表
router.post('/stats/province-workers', authenticate, statsController.provinceWorkers);

// POST /api/stats/user-monthly-logs — 用户月度公出日志明细
router.post('/stats/user-monthly-logs', authenticate, statsController.userMonthlyLogs);

// ==============================
// 统计视图管理（admin+ 管理；登录可见列表）
// ==============================

// POST /api/stats/views — 创建视图（admin+）
router.post('/stats/views', ...adminAuth, statsViewController.create);

// GET /api/stats/views/fields — 动态获取可筛选字段（登录）
router.get('/stats/views/fields', authenticate, statsViewController.fields);

// GET /api/stats/views — 当前角色可见视图列表（登录）
router.get('/stats/views', authenticate, statsViewController.list);

// GET /api/stats/views/:id — 视图详情（登录，不可见 403）
router.get('/stats/views/:id', authenticate, statsViewController.get);

// PUT /api/stats/views/:id — 更新视图（admin+，锁定需先解锁）
router.put('/stats/views/:id', ...adminAuth, statsViewController.update);

// POST /api/stats/views/:id/lock — 锁定视图（admin+）
router.post('/stats/views/:id/lock', ...adminAuth, statsViewController.lock);

// POST /api/stats/views/:id/unlock — 解锁视图（admin+）
router.post('/stats/views/:id/unlock', ...adminAuth, statsViewController.unlock);

// DELETE /api/stats/views/:id — 删除视图（admin+）
router.delete('/stats/views/:id', ...adminAuth, statsViewController.remove);

module.exports = router;
