'use strict';

const router = require('express').Router();
const clientErrorController = require('../controllers/client-error.controller');

// POST /api/client-error — 客户端错误上报（无需认证）
router.post('/', clientErrorController.report);

module.exports = router;
