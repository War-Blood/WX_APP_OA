'use strict';

const express = require('express');
const router = express.Router();

// 健康检查路由（无需认证）
router.use('/', require('./health'));

// 后续模块在此添加，如：
// router.use('/', require('./auth'));   // M3 实现
// router.use('/', require('./user'));   // M3 实现

module.exports = router;
