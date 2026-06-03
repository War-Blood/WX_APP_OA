'use strict';

const adminService = require('../services/admin.service');
const { success } = require('../../common/utils/response');
const { ValidationError } = require('../../common/utils/errors');

/**
 * POST /api/admin/users
 * 获取用户列表（带分页和筛选）
 */
async function userList(req, res, next) {
  try {
    const { page = 1, pageSize = 20, keyword, role, department, status } = req.body;
    const result = await adminService.getUserList({ page, pageSize, keyword, role, department, status });
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

module.exports = { userList, setAdmin, toggleUser, createUser, approveUser, inviteUser, setPassword, deleteUser };
