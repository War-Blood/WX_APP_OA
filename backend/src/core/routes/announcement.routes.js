'use strict';

const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const { authenticate, requireRole } = require('../../common/middleware/auth');

const adminAuth = [authenticate, requireRole('admin', 'superadmin')];

router.post('/list', ...adminAuth, announcementController.list);
router.post('/create', ...adminAuth, announcementController.create);
router.put('/:id', ...adminAuth, announcementController.update);
router.post('/:id/publish', ...adminAuth, announcementController.publish);
router.post('/:id/cancel', ...adminAuth, announcementController.cancel);
router.delete('/:id', ...adminAuth, announcementController.remove);

module.exports = router;
