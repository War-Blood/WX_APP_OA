'use strict';

const router = require('express').Router();
const adminController = require('../controllers/admin.controller');
const { authenticate, requireRole, requirePermission } = require('../../common/middleware/auth');

// 管理员及以上权限
const adminAuth = [authenticate, requireRole('admin', 'superadmin')];
// 超级管理员专属权限
const superAuth = [authenticate, requireRole('superadmin')];

// ==============================
// 用户管理
// ==============================
// 查看用户列表 — admin+
router.post('/admin/users',        ...adminAuth, adminController.userList);
router.get('/admin/users/:id',     ...adminAuth, adminController.getUserDetail);

// 编辑用户 — admin+
router.put('/admin/users/:id',     ...adminAuth, adminController.updateUser);
router.post('/admin/users/batch',  ...adminAuth, adminController.batchImportUsers);
router.post('/admin/createUser',   ...adminAuth, adminController.createUser);
router.post('/admin/approveUser',  ...adminAuth, adminController.approveUser);
router.post('/admin/inviteUser',   ...adminAuth, adminController.inviteUser);
router.post('/admin/setPassword',  ...adminAuth, adminController.setPassword);

// 设置管理员角色 — 仅 superadmin
router.post('/admin/setAdmin',     ...superAuth, adminController.setAdmin);
// 启用/禁用用户 — admin+
router.post('/admin/toggleUser',   ...adminAuth, adminController.toggleUser);
// 出差状态设置 — admin+
router.post('/admin/set-biz-trip',       ...adminAuth, adminController.setBizTripStatus);
router.post('/admin/batch-set-biz-trip', ...adminAuth, adminController.batchSetBizTripStatus);
// 删除用户 — admin+
router.post('/admin/deleteUser',   ...adminAuth, adminController.deleteUser);

// ==============================
// 部门管理 — admin+
// ==============================
router.get('/admin/departments',        ...adminAuth, adminController.getDepartments);
router.post('/admin/departments',       ...adminAuth, adminController.createDepartment);
router.put('/admin/departments/:id',    ...adminAuth, adminController.updateDepartment);
router.delete('/admin/departments/:id', ...adminAuth, adminController.deleteDepartment);

// ==============================
// 角色管理 — 仅 superadmin
// ==============================
router.get('/admin/roles',                    ...superAuth, adminController.getRoles);
router.get('/admin/roles/:id',                ...superAuth, adminController.getRoleDetail);
router.post('/admin/roles',                   ...superAuth, adminController.createRole);
router.put('/admin/roles/:id',                ...superAuth, adminController.updateRole);
router.delete('/admin/roles/:id',             ...superAuth, adminController.deleteRole);
router.put('/admin/roles/:id/permissions',    ...superAuth, adminController.setRolePermissions);

// ==============================
// 权限管理 — 仅 superadmin
// ==============================
router.get('/admin/permissions', ...superAuth, adminController.getPermissions);

// ==============================
// 审批类型管理 — admin+
// ==============================
router.get('/admin/approval-types',       ...adminAuth, adminController.getApprovalTypes);
router.put('/admin/approval-types/:id',   ...adminAuth, adminController.updateApprovalType);

// ==============================
// 花名册管理（v2.0 新增）— list 仅需登录，增删改需 admin+
// ==============================
router.post('/admin/workers', authenticate, adminController.workers);

// ==============================
// 模块可见性管理 — 登录即可查看，仅 superadmin 可保存
// ==============================
router.post('/admin/modules', authenticate, adminController.modules);

// ==============================
// 系统设置 — 仅 superadmin
// ==============================
router.get('/admin/settings',  ...superAuth, adminController.getSettings);
router.put('/admin/settings',  ...superAuth, adminController.updateSettings);

// ==============================
// CDK 邀请码管理 — admin+
// ==============================
router.post('/admin/invite/generate', authenticate, requireRole('admin', 'superadmin'), adminController.generateInviteCode);

// ==============================
// 公开接口 — 小程序获取可见模块
// ==============================
router.get('/modules', adminController.publicModules);

module.exports = router;
