'use strict';

const adminService = require('../services/admin.service');
const workerService = require('../services/worker.service');
const moduleService = require('../services/module.service');
const inviteService = require('../services/invite.service');
const { success, paginated } = require('../../common/utils/response');
const { ValidationError } = require('../../common/utils/errors');

/**
 * POST /api/admin/users
 * 获取用户列表（带分页和筛选）
 */
async function userList(req, res, next) {
  try {
    const { page = 1, pageSize = 20, keyword, role, department, departmentId, status } = req.body;
    const result = await adminService.getUserList({ page, pageSize, keyword, role, department, departmentId, status });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/setAdmin
 * 设置/取消用户的管理员角色
 */
async function setAdmin(req, res, next) {
  try {
    const { userId, role } = req.body;
    if (!userId) throw new ValidationError('userId 不能为空');
    if (!['admin', 'employee'].includes(role)) throw new ValidationError('角色值无效，仅支持 admin 或 employee');

    const result = await adminService.setAdminRole(userId, role);
    res.json(success(result, '角色更新成功'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/toggleUser
 * 启用/禁用用户
 */
async function toggleUser(req, res, next) {
  try {
    const { userId, status } = req.body;
    if (!userId) throw new ValidationError('userId 不能为空');
    if (!['active', 'disabled'].includes(status)) throw new ValidationError('状态值无效，仅支持 active 或 disabled');

    const result = await adminService.toggleUserStatus(userId, status);
    res.json(success(result, status === 'active' ? '用户已启用' : '用户已禁用'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/createUser
 * 管理员预注册用户（openid + 基本信息）
 */
async function createUser(req, res, next) {
  try {
    const { openid, userName, department, role } = req.body;
    if (!openid) throw new ValidationError('微信 OpenID 不能为空');

    const result = await adminService.createUser({ openid, userName, department, role });
    res.json(success(result, '用户已注册，等待管理员审核'));
  } catch (err) {
    next(err);
  }
}

/**
 * 管理员直接邀请用户（跳过审核，直接 active）
 * POST /api/admin/inviteUser
 */
async function inviteUser(req, res, next) {
  try {
    const { openid, userName, department, role } = req.body;
    if (!openid) throw new ValidationError('微信 ID 不能为空');
    const result = await adminService.inviteUser({ openid, userName, department, role });
    res.json(success(result, result.reactivated ? '用户已重新激活' : '用户已邀请成功'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/approveUser
 * 审核通过用户（pending → active）
 */
async function approveUser(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) throw new ValidationError('userId 不能为空');

    const result = await adminService.approveUser(userId);
    res.json(success(result, '用户审核通过'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/setPassword
 * 管理员为用户设置密码
 */
async function setPassword(req, res, next) {
  try {
    const { userId, password } = req.body;
    if (!userId) throw new ValidationError('userId 不能为空');
    if (!password) throw new ValidationError('密码不能为空');

    const result = await adminService.setUserPassword(userId, password);
    res.json(success(result, '密码设置成功'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/deleteUser
 * 管理员删除用户（软删除）
 */
async function deleteUser(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) throw new ValidationError('用户 ID 不能为空');
    const result = await adminService.deleteUser(userId);
    res.json(success(result, '用户已删除'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/users/:id
 * 获取单个用户详情
 */
async function getUserDetail(req, res, next) {
  try {
    const { id } = req.params;
    const result = await adminService.getUserDetail(id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/users/:id
 * 更新用户信息
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { userName, email, phone, departmentId, position, role } = req.body;
    const result = await adminService.updateUser(id, { userName, email, phone, departmentId, position, role });
    res.json(success(result, '用户信息已更新'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/users/batch
 * 批量导入用户
 */
async function batchImportUsers(req, res, next) {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users)) throw new ValidationError('参数 users 必须为数组');
    const result = await adminService.batchImportUsers(users);
    res.json(success(result, `导入完成: 成功${result.success}条, 跳过${result.skipped}条, 失败${result.failed}条`));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/departments
 * 获取部门树或列表
 */
async function getDepartments(req, res, next) {
  try {
    const { flat } = req.query;
    const result = flat === 'true'
      ? await adminService.getDepartmentList()
      : await adminService.getDepartmentTree();
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/departments
 * 创建部门
 */
async function createDepartment(req, res, next) {
  try {
    const { name, parentId, managerId, sortOrder, description } = req.body;
    if (!name) throw new ValidationError('部门名称不能为空');
    const result = await adminService.createDepartment({ name, parentId, managerId, sortOrder, description });
    res.json(success(result, '部门已创建'));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/departments/:id
 * 更新部门
 */
async function updateDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const { name, parentId, managerId, sortOrder, description } = req.body;
    const result = await adminService.updateDepartment(id, { name, parentId, managerId, sortOrder, description });
    res.json(success(result, '部门已更新'));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/departments/:id
 * 删除部门
 */
async function deleteDepartment(req, res, next) {
  try {
    const { id } = req.params;
    const result = await adminService.deleteDepartment(id);
    res.json(success(result, '部门已删除'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/roles
 * 获取角色列表
 */
async function getRoles(req, res, next) {
  try {
    const result = await adminService.getRoleList();
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/roles/:id
 * 获取角色详情（含权限）
 */
async function getRoleDetail(req, res, next) {
  try {
    const { id } = req.params;
    const result = await adminService.getRoleDetail(id);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/roles
 * 创建角色
 */
async function createRole(req, res, next) {
  try {
    const { code, name, description } = req.body;
    if (!code) throw new ValidationError('角色标识不能为空');
    if (!name) throw new ValidationError('角色名称不能为空');
    const result = await adminService.createRole({ code, name, description });
    res.json(success(result, '角色已创建'));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/roles/:id
 * 更新角色
 */
async function updateRole(req, res, next) {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;
    const result = await adminService.updateRole(id, { name, description, status });
    res.json(success(result, '角色已更新'));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/roles/:id
 * 删除角色
 */
async function deleteRole(req, res, next) {
  try {
    const { id } = req.params;
    const result = await adminService.deleteRole(id);
    res.json(success(result, '角色已删除'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/permissions
 * 获取权限列表（分组）
 */
async function getPermissions(req, res, next) {
  try {
    const result = await adminService.getPermissionList();
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/roles/:id/permissions
 * 设置角色权限
 */
async function setRolePermissions(req, res, next) {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;
    if (!permissionIds || !Array.isArray(permissionIds)) {
      throw new ValidationError('permissionIds 必须为数组');
    }
    const result = await adminService.setRolePermissions(id, permissionIds);
    res.json(success(result, '权限已更新'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/approval-types
 * 获取审批类型列表
 */
async function getApprovalTypes(req, res, next) {
  try {
    const result = await adminService.getApprovalTypes();
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/approval-types/:id
 * 更新审批类型配置
 */
async function updateApprovalType(req, res, next) {
  try {
    const { id } = req.params;
    const { name, icon, sortOrder, needAttachment, needRemark, formTemplate, status } = req.body;
    const result = await adminService.updateApprovalType(id, {
      name, icon, sortOrder, needAttachment, needRemark, formTemplate, status,
    });
    res.json(success(result, '审批类型已更新'));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/settings
 * 获取系统配置
 */
async function getSettings(req, res, next) {
  try {
    const result = await adminService.getSystemConfig();
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/settings
 * 更新系统配置
 */
async function updateSettings(req, res, next) {
  try {
    const { configs } = req.body;
    if (!configs || !Array.isArray(configs)) throw new ValidationError('configs 必须为数组');
    const result = await adminService.updateSystemConfig(configs);
    res.json(success(result, '配置已保存'));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/workers — 花名册统一入口（v2.0 新增）
 * 通过 action 字段区分操作: list / create / update / toggle / delete
 */
async function workers(req, res, next) {
  try {
    const { action, ...data } = req.body;

    if (!action) {
      throw new ValidationError('action 不能为空');
    }

    const validActions = ['list', 'create', 'update', 'toggle', 'toggleFieldWorker', 'generateCodes', 'nonRoster', 'delete'];
    if (!validActions.includes(action)) {
      throw new ValidationError(`不支持的操作: ${action}，仅支持 ${validActions.join('/')}`);
    }

    // list 仅需登录，其余操作需 admin+
    const writeActions = ['create', 'update', 'toggle', 'toggleFieldWorker', 'generateCodes', 'delete'];
    if (writeActions.includes(action) && req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
      throw new (require('../../common/utils/errors').AuthError)('仅管理员可执行此操作');
    }

    const result = await workerService.dispatch(action, data);

    // 按 action 返回不同的 success message
    const messages = {
      list: 'success',
      create: '创建成功',
      update: '更新成功',
      toggle: '状态已更新',
      toggleFieldWorker: '作业人员标记已更新',
      generateCodes: '工号生成成功',
      nonRoster: 'success',
      delete: '删除成功',
    };

    if (action === 'list') {
      res.json(paginated(result.list, result.total, data.page || 1, data.pageSize || 20));
    } else {
      res.json(success(result, messages[action]));
    }
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/modules — 模块可见性管理统一入口
 * action: getModules(登录即可) / saveModules(superadmin)
 */
async function modules(req, res, next) {
  try {
    const { action, platform } = req.body;
    const userRole = req.user?.role || 'employee';

    if (!action) {
      throw new ValidationError('action 不能为空');
    }

    if (action === 'getModules') {
      const list = await moduleService.getModules(platform, userRole);
      res.json(success(list));
    } else if (action === 'saveModules') {
      // 仅 superadmin 可保存
      if (req.user?.role !== 'superadmin') {
        throw new (require('../../common/utils/errors').AuthError)('仅超级管理员可修改模块配置');
      }
      const { modules } = req.body;
      await moduleService.saveModules(modules);
      res.json(success(null, '模块配置已保存'));
    } else {
      throw new ValidationError(`不支持的操作: ${action}`);
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/modules — 公开接口，小程序端获取可见模块
 * 无需认证，自动按 platform=miniapp 过滤
 */
async function publicModules(req, res, next) {
  try {
    const list = await moduleService.getModules('miniapp');
    res.json(success(list));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/invite/generate
 * 管理员批量生成 CDK 邀请码
 */
async function generateInviteCode(req, res, next) {
  try {
    const { count = 1 } = req.body;
    const result = await inviteService.generateInviteCodes(count, req.user.userId);
    res.json(success(result, `已生成 ${result.codes.length} 个邀请码`));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/set-biz-trip
 * 设置单个用户出差状态
 */
async function setBizTripStatus(req, res, next) {
  try {
    const { userId, bizTripStatus } = req.body;
    if (!userId) throw new ValidationError('userId 不能为空');
    const result = await adminService.setBizTripStatus(userId, bizTripStatus);
    res.json(success(result, bizTripStatus === 'field' ? '已设为出差' : '已设为回公司'));
  } catch (err) { next(err); }
}

/**
 * POST /api/admin/batch-set-biz-trip
 * 批量设置用户出差状态
 */
async function batchSetBizTripStatus(req, res, next) {
  try {
    const { userIds, bizTripStatus } = req.body;
    const result = await adminService.batchSetBizTripStatus(userIds, bizTripStatus);
    res.json(success(result, `${result.updated} 人已设为${bizTripStatus === 'field' ? '出差' : '回公司'}`));
  } catch (err) { next(err); }
}

// ============================================
// 角色分组 (Role Groups) — V2.5
// ============================================

async function getRoleGroups(req, res, next) {
  try { res.json(success(await adminService.getRoleGroups())); } catch (err) { next(err); }
}

async function getRoleGroupDetail(req, res, next) {
  try { res.json(success(await adminService.getRoleGroupDetail(req.params.id))); } catch (err) { next(err); }
}

async function createRoleGroup(req, res, next) {
  try { res.json(success(await adminService.createRoleGroup(req.body))); } catch (err) { next(err); }
}

async function updateRoleGroup(req, res, next) {
  try { res.json(success(await adminService.updateRoleGroup(req.params.id, req.body))); } catch (err) { next(err); }
}

async function deleteRoleGroup(req, res, next) {
  try { res.json(success(await adminService.deleteRoleGroup(req.params.id))); } catch (err) { next(err); }
}

module.exports = {
  userList, getUserDetail, updateUser, batchImportUsers,
  setAdmin, toggleUser, createUser, approveUser, inviteUser,
  setPassword, deleteUser,
  setBizTripStatus, batchSetBizTripStatus,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getRoles, getRoleDetail, createRole, updateRole, deleteRole,
  getPermissions, setRolePermissions,
  getRoleGroups, getRoleGroupDetail, createRoleGroup, updateRoleGroup, deleteRoleGroup,
  getApprovalTypes, updateApprovalType,
  getSettings, updateSettings,
  workers,
  modules,
  publicModules,
  generateInviteCode,
};
