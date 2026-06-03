'use strict';

const router = require('express').Router();
const healthRoutes = require('./health.routes');
const reportRoutes = require('./report.routes');
const approvalRoutes = require('./approval.routes');
const messageRoutes = require('./message.routes');
const clientErrorRoutes = require('./client-error.routes');
const adminRoutes = require('./admin.routes');
const projectRoutes = require('./project.routes');

router.use('/', healthRoutes);
router.use('/report', reportRoutes);
router.use('/approval', approvalRoutes);
router.use('/message', messageRoutes);
router.use('/client-error', clientErrorRoutes);
router.use('/', adminRoutes);
router.use('/project', projectRoutes);

module.exports = router;
