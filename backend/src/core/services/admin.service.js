'use strict';

const bcrypt = require('bcryptjs');
const db = require('../../common/config/database');
const { BusinessError, ValidationError } = require('../../common/utils/errors');
const logger = require('../../common/utils/logger');
const { nextWorkerCode } = require('../../common/utils/worker-code');

/**
 * 管理员服务 — 用户管理
 */

/**
 * 获取用户列表（带分页和筛选）
 */
async function getUserList({ page = 1, pageSize = 20, keyword, role, department, departmentId, status }) {
  const conditions = ['deleted_at IS NULL', "status = 'active'"];
  const params = [];

  // status 参数传 'all' 时可覆盖默认过滤，查询所有状态的用户
  if (status && status !== 'active') {
    conditions.pop(); // 移除默认 status = 'active'
    if (status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }
  }
  if (keyword) {
    conditions.push('(nickname LIKE ? OR user_name LIKE ? OR department LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  if (department) {
    conditions.push('department = ?');
    params.push(department);
  }
  if (departmentId !== undefined) {
    if (departmentId === null) {
      conditions.push('department_id IS NULL');
    } else {
      conditions.push('department_id = ?');
      params.push(departmentId);
    }
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // 总数
  const countSql = `SELECT COUNT(*) AS total FROM users ${whereClause}`;
  const countRows = await db.query(countSql, params);
  const total = countRows[0].total;

  // 分页数据
  const offset = (page - 1) * pageSize;
  const dataSql = `SELECT id, openid, nickname, user_name, email, phone,
    avatar_url, role, department, department_id, position, worker_code, status, biz_trip_status, last_login_at, created_at
    FROM users ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?`;

  const listParams = [...params, pageSize, offset];
  const rows = await db.query(dataSql, listParams);

  // 格式化输出
  const list = rows.map(row => ({
    userId: String(row.id),
    nickName: row.nickname || row.user_name || '未知',
    userName: row.user_name,
    avatarUrl: row.avatar_url || '',
    role: row.role,
    department: row.department || '',
    departmentId: row.department_id,
    position: row.position || '',
    phone: row.phone || '',
    email: row.email || '',
    workerCode: row.worker_code || '',
    status: row.status,
    bizTripStatus: row.biz_trip_status || '',
    lastLoginTime: row.last_login_at ? formatDate(row.last_login_at) : '',
    createdAt: row.created_at ? formatDate(row.created_at) : '',
  }));

  return { total, page, pageSize, list };
}

/**
 * 设置用户角色
 */
async function setAdminRole(userId, role) {
  // 检查用户是否存在
  const users = await db.query('SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (users.length === 0) {
    throw new BusinessError('用户不存在');
  }

  if (users[0].role === 'superadmin') {
    throw new BusinessError('不能修改超级管理员角色');
  }

  await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, userId]);

  logger.info('管理员角色变更', { module: 'ADMIN', userId, newRole: role });
  return { userId: String(userId), role };
}

/**
 * 启用/禁用用户
 */
async function toggleUserStatus(userId, status) {
  const users = await db.query('SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (users.length === 0) {
    throw new BusinessError('用户不存在');
  }

  if (users[0].role === 'superadmin') {
    throw new BusinessError('不能禁用超级管理员');
  }

  await db.execute('UPDATE users SET status = ? WHERE id = ?', [status, userId]);

  logger.info('用户状态变更', { module: 'ADMIN', userId, status });
  return { userId: String(userId), status };
}

/**
 * 设置用户出差状态 (field=出差 / office=公司)
 */
async function setBizTripStatus(userId, bizTripStatus) {
  if (!['field', 'office'].includes(bizTripStatus)) {
    throw new ValidationError('状态值无效，仅支持 field 或 office');
  }
  await db.execute(
    'UPDATE users SET biz_trip_status = ?, worker_status = ?, updated_at = NOW() WHERE id = ?',
    [bizTripStatus, 'active', userId]
  );
  return { userId, bizTripStatus };
}

/**
 * 批量设置用户出差状态
 */
async function batchSetBizTripStatus(userIds, bizTripStatus) {
  if (!['field', 'office'].includes(bizTripStatus)) {
    throw new ValidationError('状态值无效');
  }
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new ValidationError('userIds 不能为空');
  }
  const placeholders = userIds.map(() => '?').join(',');
  await db.execute(
    `UPDATE users SET biz_trip_status = ?, worker_status = 'active', updated_at = NOW() WHERE id IN (${placeholders})`,
    [bizTripStatus, ...userIds]
  );
  return { updated: userIds.length, bizTripStatus };
}

/**
 * 管理员预注册用户（通过 openid）
 * 创建 pending 状态用户，需管理员审核通过后才能登录
 */
async function createUser({ openid, userName, department, role }) {
  if (!openid || !openid.trim()) {
    throw new BusinessError('微信 OpenID 不能为空');
  }

  // 检查 openid 是否已存在
  const existing = await db.query('SELECT id FROM users WHERE openid = ?', [openid]);
  if (existing.length > 0) {
    throw new BusinessError('该微信账号已注册，请勿重复添加');
  }

  const workerCode = await nextWorkerCode(role || 'employee');
  const result = await db.execute(
    `INSERT INTO users (openid, user_name, nickname, department, role, worker_code, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
    [openid.trim(), userName || null, userName || null, department || null, role || 'employee', workerCode]
  );

  logger.info('管理员预注册用户', { module: 'ADMIN', openid, userId: result[0].insertId });

  return {
    userId: String(result[0].insertId),
    openid,
    userName: userName || null,
    status: 'pending',
  };
}

/**
 * 管理员审核通过用户（pending → active）
 */
async function approveUser(userId) {
  const users = await db.query(
    'SELECT id, status, openid FROM users WHERE id = ? AND deleted_at IS NULL',
    [userId]
  );
  if (users.length === 0) throw new BusinessError('用户不存在');
  if (users[0].status !== 'pending') throw new BusinessError('该用户无需审核');

  // 检查是否设置了密码（可选：管理员可设密码）
  await db.execute(
    'UPDATE users SET status = ? WHERE id = ?',
    ['active', userId]
  );

  logger.info('管理员审核通过用户', { module: 'ADMIN', userId });

  return { userId: String(userId), status: 'active' };
}

/**
 * 管理员直接邀请用户（跳过审核）
 * openid → 创建 active 状态用户
 */
async function inviteUser({ openid, userName, department, role }) {
  if (!openid) throw new ValidationError('微信 ID 不能为空');
  const finalName = userName || '已邀请用户';
  const finalRole = role || 'employee';
  const finalDept = department || '';

  // 查重
  const existing = await db.query('SELECT id, status FROM users WHERE openid = ?', [openid]);
  if (existing.length > 0) {
    const u = existing[0];
    if (u.status === 'active') throw new BusinessError('该用户已是活跃状态，无需重复邀请');
    // 已存在但 disabled/pending → 直接激活
    await db.execute("UPDATE users SET status='active', role=?, department=?, user_name=? WHERE id=?",
      [finalRole, finalDept, finalName, u.id]);
    return { userId: String(u.id), status: 'active', reactivated: true };
  }

  const workerCode = await nextWorkerCode(finalRole);
  const result = await db.execute(
    "INSERT INTO users (openid, user_name, role, department, worker_code, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', NOW())",
    [openid, finalName, finalRole, finalDept, workerCode]
  );

  return { userId: String(result[0].insertId), status: 'active', created: true };
}

/**
 * 管理员为用户设置密码
 */
async function setUserPassword(userId, password) {
  if (!password || password.length < 8) {
    throw new BusinessError('密码长度不能少于8位');
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new BusinessError('密码必须包含字母和数字');
  }

  const users = await db.query('SELECT id FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (users.length === 0) throw new BusinessError('用户不存在');

  const hash = await bcrypt.hash(password, 10);
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hash, userId]);

  logger.info('管理员设置用户密码', { module: 'ADMIN', userId });
  return { userId: String(userId) };
}

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * 获取单个用户详情
 */
async function getUserDetail(userId) {
  const rows = await db.query(
    `SELECT id, openid, nickname, user_name, email, phone, avatar_url,
      role, department, department_id, position, status, last_login_at, created_at
    FROM users WHERE id = ? AND deleted_at IS NULL`,
    [userId]
  );
  if (rows.length === 0) throw new BusinessError('用户不存在');

  const row = rows[0];
  return {
    userId: String(row.id),
    nickName: row.nickname || row.user_name || '未知',
    userName: row.user_name,
    avatarUrl: row.avatar_url || '',
    role: row.role,
    department: row.department || '',
    departmentId: row.department_id,
    position: row.position || '',
    phone: row.phone || '',
    email: row.email || '',
    status: row.status,
    lastLoginTime: row.last_login_at ? formatDate(row.last_login_at) : '',
    createdAt: row.created_at ? formatDate(row.created_at) : '',
  };
}

/**
 * 更新用户信息
 */
async function updateUser(userId, { userName, email, phone, departmentId, position, role }) {
  const users = await db.query('SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (users.length === 0) throw new BusinessError('用户不存在');

  if (users[0].role === 'superadmin' && role && role !== 'superadmin') {
    throw new BusinessError('不能修改超级管理员的角色');
  }

  const updates = [];
  const params = [];

  if (userName !== undefined) {
    updates.push('user_name = ?, nickname = ?');
    params.push(userName, userName);
  }
  if (email !== undefined) {
    updates.push('email = ?');
    params.push(email || null);
  }
  if (phone !== undefined) {
    updates.push('phone = ?');
    params.push(phone || null);
  }
  if (departmentId !== undefined) {
    updates.push('department_id = ?');
    params.push(departmentId || null);
    // 同步更新 department 名称字段（冗余字段）
    if (departmentId) {
      const depts = await db.query('SELECT name FROM departments WHERE id = ?', [departmentId]);
      if (depts.length > 0) {
        updates.push('department = ?');
        params.push(depts[0].name);
      }
    } else {
      updates.push('department = ?');
      params.push(null);
    }
  }
  if (position !== undefined) {
    updates.push('position = ?');
    params.push(position || null);
  }
  if (role !== undefined) {
    updates.push('role = ?');
    params.push(role);
  }

  if (updates.length === 0) throw new BusinessError('没有需要更新的字段');

  params.push(userId);
  await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

  logger.info('管理员更新用户信息', { module: 'ADMIN', userId, fields: Object.keys({ userName, email, phone, departmentId, position, role }).filter(k => ({userName, email, phone, departmentId, position, role})[k] !== undefined) });
  return { userId: String(userId) };
}

/**
 * 批量导入用户
 * @param {Array} users - [{ openid, userName, department, departmentId, role }]
 */
async function batchImportUsers(users) {
  if (!Array.isArray(users) || users.length === 0) {
    throw new BusinessError('导入数据不能为空');
  }
  if (users.length > 500) {
    throw new BusinessError('单次导入不能超过500条');
  }

  const results = { total: users.length, success: 0, skipped: 0, failed: 0, details: [] };

  for (const u of users) {
    try {
      if (!u.openid || !u.openid.trim()) {
        results.failed++;
        results.details.push({ openid: u.openid || '', reason: 'OpenID 为空' });
        continue;
      }

      const existing = await db.query('SELECT id, status FROM users WHERE openid = ?', [u.openid.trim()]);
      if (existing.length > 0) {
        results.skipped++;
        results.details.push({ openid: u.openid, reason: '用户已存在' });
        continue;
      }

      const workerCode = await nextWorkerCode(u.role || 'employee');
      await db.execute(
        `INSERT INTO users (openid, user_name, nickname, department, department_id, role, worker_code, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [
          u.openid.trim(),
          u.userName || null,
          u.userName || null,
          u.department || null,
          u.departmentId || null,
          u.role || 'employee',
          workerCode,
        ]
      );
      results.success++;
    } catch (err) {
      results.failed++;
      results.details.push({ openid: u.openid || '', reason: err.message });
    }
  }

  logger.info('批量导入用户', { module: 'ADMIN', ...results });
  return results;
}

/**
 * 获取部门树
 */
async function getDepartmentTree() {
  const rows = await db.query(
    'SELECT id, name, parent_id, manager_id, sort_order, description, status FROM departments WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC'
  );

  // 构建树形结构
  const map = {};
  const tree = [];

  rows.forEach(row => {
    map[row.id] = {
      id: row.id,
      name: row.name,
      parentId: row.parent_id,
      managerId: row.manager_id,
      sortOrder: row.sort_order,
      description: row.description,
      status: row.status,
      children: [],
    };
  });

  rows.forEach(row => {
    const node = map[row.id];
    if (row.parent_id && map[row.parent_id]) {
      map[row.parent_id].children.push(node);
    } else {
      tree.push(node);
    }
  });

  // 移除空的 children 数组
  function cleanChildren(nodes) {
    nodes.forEach(node => {
      if (node.children.length === 0) {
        delete node.children;
      } else {
        cleanChildren(node.children);
      }
    });
  }
  cleanChildren(tree);

  return tree;
}

/**
 * 获取部门列表（扁平，用于下拉选择）
 */
async function getDepartmentList() {
  const rows = await db.query(
    'SELECT id, name, parent_id, sort_order, status FROM departments WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC'
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    parentId: r.parent_id,
    sortOrder: r.sort_order,
    status: r.status,
  }));
}

/**
 * 创建部门
 */
async function createDepartment({ name, parentId, managerId, sortOrder, description }) {
  if (!name || !name.trim()) throw new ValidationError('部门名称不能为空');

  if (parentId) {
    const parents = await db.query('SELECT id FROM departments WHERE id = ? AND deleted_at IS NULL', [parentId]);
    if (parents.length === 0) throw new BusinessError('上级部门不存在');
  }

  const result = await db.execute(
    `INSERT INTO departments (name, parent_id, manager_id, sort_order, description)
     VALUES (?, ?, ?, ?, ?)`,
    [name.trim(), parentId || null, managerId || null, sortOrder || 0, description || null]
  );

  logger.info('创建部门', { module: 'ADMIN', deptId: result[0].insertId, name });
  return { id: result[0].insertId, name: name.trim() };
}

/**
 * 更新部门
 */
async function updateDepartment(id, { name, parentId, managerId, sortOrder, description }) {
  const depts = await db.query('SELECT id FROM departments WHERE id = ? AND deleted_at IS NULL', [id]);
  if (depts.length === 0) throw new BusinessError('部门不存在');

  if (parentId === id) throw new BusinessError('上级部门不能是自己');

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name.trim());
  }
  if (parentId !== undefined) {
    updates.push('parent_id = ?');
    params.push(parentId || null);
  }
  if (managerId !== undefined) {
    updates.push('manager_id = ?');
    params.push(managerId || null);
  }
  if (sortOrder !== undefined) {
    updates.push('sort_order = ?');
    params.push(sortOrder);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }

  if (updates.length === 0) throw new BusinessError('没有需要更新的字段');

  params.push(id);
  await db.execute(`UPDATE departments SET ${updates.join(', ')} WHERE id = ?`, params);

  logger.info('更新部门', { module: 'ADMIN', deptId: id });
  return { id };
}

/**
 * 软删除部门
 */
/**
 * 递归收集所有子部门 ID
 * @param {number} parentId
 * @returns {Promise<number[]>}
 */
async function getChildDepartmentIds(parentId) {
  const ids = [];
  const children = await db.query(
    'SELECT id FROM departments WHERE parent_id = ? AND deleted_at IS NULL',
    [parentId]
  );
  for (const child of children) {
    ids.push(child.id);
    const grandChildren = await getChildDepartmentIds(child.id);
    ids.push(...grandChildren);
  }
  return ids;
}

async function deleteDepartment(id) {
  const depts = await db.query('SELECT id, name FROM departments WHERE id = ? AND deleted_at IS NULL', [id]);
  if (depts.length === 0) throw new BusinessError('部门不存在');

  // 递归收集所有子部门ID
  const childIds = await getChildDepartmentIds(id);
  const allDeptIds = [id, ...childIds];

  // 级联软删除父部门及所有子部门
  await db.execute(
    `UPDATE departments SET deleted_at = NOW() WHERE id IN (${allDeptIds.map(() => '?').join(',')})`,
    allDeptIds
  );

  // 清空受影响部门下所有员工的部门关联
  await db.execute(
    `UPDATE users SET department_id = NULL, department = NULL WHERE department_id IN (${allDeptIds.map(() => '?').join(',')})`,
    allDeptIds
  );

  logger.info('级联删除部门', { module: 'ADMIN', deptId: id, deptName: depts[0].name, childCount: childIds.length, totalDeleted: allDeptIds.length });
  return { id, deletedDeptCount: allDeptIds.length };
}

/**
 * 获取角色列表（用于下拉选择）
 */
async function getRoleList() {
  const rows = await db.query(
    'SELECT id, code, name, description, is_system, status FROM roles WHERE deleted_at IS NULL ORDER BY id ASC'
  );
  return rows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name,
    description: r.description,
    isSystem: !!r.is_system,
    status: r.status,
  }));
}

/**
 * 获取角色详情（含权限列表）
 */
async function getRoleDetail(id) {
  const rows = await db.query(
    'SELECT id, code, name, description, is_system, status FROM roles WHERE id = ? AND deleted_at IS NULL', [id]
  );
  if (rows.length === 0) throw new BusinessError('角色不存在');

  const role = rows[0];

  // 获取角色的权限列表
  const perms = await db.query(
    `SELECT p.id, p.code, p.name, p.group_code, p.group_name
     FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = ?
     ORDER BY p.group_code, p.sort_order`,
    [id]
  );

  return {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    isSystem: !!role.is_system,
    status: role.status,
    permissions: perms.map(p => ({
      id: p.id,
      code: p.code,
      name: p.name,
      groupCode: p.group_code,
      groupName: p.group_name,
    })),
  };
}

/**
 * 创建角色
 */
async function createRole({ code, name, description }) {
  if (!code || !code.trim()) throw new ValidationError('角色标识不能为空');
  if (!name || !name.trim()) throw new ValidationError('角色名称不能为空');
  if (!/^[a-z_][a-z0-9_]*$/.test(code)) throw new ValidationError('角色标识只能包含小写字母、数字和下划线');

  const existing = await db.query('SELECT id FROM roles WHERE code = ? AND deleted_at IS NULL', [code.trim()]);
  if (existing.length > 0) throw new BusinessError('角色标识已存在');

  const result = await db.execute(
    'INSERT INTO roles (code, name, description) VALUES (?, ?, ?)',
    [code.trim(), name.trim(), description || null]
  );

  logger.info('创建角色', { module: 'ADMIN', roleCode: code, roleId: result[0].insertId });
  return { id: result[0].insertId, code: code.trim(), name: name.trim() };
}

/**
 * 更新角色
 */
async function updateRole(id, { name, description, status }) {
  const rows = await db.query('SELECT id, is_system FROM roles WHERE id = ? AND deleted_at IS NULL', [id]);
  if (rows.length === 0) throw new BusinessError('角色不存在');

  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (status !== undefined) {
    if (!['active', 'disabled'].includes(status)) throw new ValidationError('状态值无效');
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) throw new BusinessError('没有需要更新的字段');

  params.push(id);
  await db.execute(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, params);

  // 清除权限缓存
  const { clearPermissionCache } = require('../../common/middleware/auth');
  clearPermissionCache(rows[0].code);

  logger.info('更新角色', { module: 'ADMIN', roleId: id });
  return { id };
}

/**
 * 软删除角色
 */
async function deleteRole(id) {
  const rows = await db.query('SELECT id, code, is_system FROM roles WHERE id = ? AND deleted_at IS NULL', [id]);
  if (rows.length === 0) throw new BusinessError('角色不存在');
  if (rows[0].is_system) throw new BusinessError('系统角色不可删除');

  // 检查是否有用户使用此角色
  const users = await db.query('SELECT COUNT(*) AS cnt FROM users WHERE role = ? AND deleted_at IS NULL', [rows[0].code]);
  if (users[0].cnt > 0) throw new BusinessError(`该角色下有 ${users[0].cnt} 个用户，请先迁移用户角色`);

  await db.execute('UPDATE roles SET deleted_at = NOW() WHERE id = ?', [id]);

  const { clearPermissionCache } = require('../../common/middleware/auth');
  clearPermissionCache(rows[0].code);

  logger.info('删除角色', { module: 'ADMIN', roleId: id, roleCode: rows[0].code });
  return { id };
}

/**
 * 获取所有权限列表（分组）
 */
async function getPermissionList() {
  const rows = await db.query(
    'SELECT id, code, name, group_code, group_name, description, sort_order FROM permissions ORDER BY group_code, sort_order'
  );

  // 按分组整理
  const groups = {};
  rows.forEach(p => {
    if (!groups[p.group_code]) {
      groups[p.group_code] = {
        groupCode: p.group_code,
        groupName: p.group_name,
        permissions: [],
      };
    }
    groups[p.group_code].permissions.push({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
    });
  });

  return Object.values(groups);
}

/**
 * 设置角色的权限
 */
async function setRolePermissions(roleId, permissionIds) {
  const rows = await db.query('SELECT id, code FROM roles WHERE id = ? AND deleted_at IS NULL', [roleId]);
  if (rows.length === 0) throw new BusinessError('角色不存在');

  // 使用事务
  await db.transaction(async (conn) => {
    // 清除现有权限
    await conn.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    // 批量插入新权限
    if (permissionIds && permissionIds.length > 0) {
      const values = permissionIds.map(pid => [roleId, pid]);
      // 简单批量 INSERT
      for (const [rid, pid] of values) {
        await conn.execute(
          'INSERT IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
          [rid, pid]
        );
      }
    }
  });

  const { clearPermissionCache } = require('../../common/middleware/auth');
  clearPermissionCache(rows[0].code);

  logger.info('设置角色权限', { module: 'ADMIN', roleId, permissionCount: permissionIds?.length || 0 });
  return { roleId, permissionCount: permissionIds?.length || 0 };
}

// ============================================
// 角色分组 (Role Groups) — V2.5
// ============================================

async function getRoleGroups() {
  const rows = await db.query(
    'SELECT id, code, name, description, sort_order, is_system, status FROM role_groups WHERE deleted_at IS NULL ORDER BY sort_order ASC'
  );
  return rows.map(r => ({
    id: r.id, code: r.code, name: r.name, description: r.description,
    sortOrder: r.sort_order, isSystem: !!r.is_system, status: r.status,
  }));
}

async function getRoleGroupDetail(id) {
  const rows = await db.query('SELECT * FROM role_groups WHERE id = ? AND deleted_at IS NULL', [id]);
  if (rows.length === 0) throw new BusinessError('角色分组不存在');
  const r = rows[0];
  return { id: r.id, code: r.code, name: r.name, description: r.description, sortOrder: r.sort_order, isSystem: !!r.is_system, status: r.status };
}

async function createRoleGroup({ code, name, description, sortOrder }) {
  if (!code || !/^[a-z_][a-z0-9_]*$/.test(code)) throw new BusinessError('标识格式错误（小写字母+数字+下划线）');
  const exist = await db.query('SELECT id FROM role_groups WHERE code = ? AND deleted_at IS NULL', [code]);
  if (exist.length) throw new BusinessError('分组标识已存在');
  const result = await db.execute(
    'INSERT INTO role_groups (code, name, description, sort_order) VALUES (?, ?, ?, ?)',
    [code, name, description || null, sortOrder || 0]
  );
  return { id: result.insertId };
}

async function updateRoleGroup(id, { name, description, sortOrder }) {
  const rows = await db.query('SELECT id FROM role_groups WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!rows.length) throw new BusinessError('角色分组不存在');
  const updates = []; const params = [];
  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(sortOrder); }
  if (!updates.length) return { id };
  await db.execute(`UPDATE role_groups SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, [...params, id]);
  return { id };
}

async function deleteRoleGroup(id) {
  const rows = await db.query('SELECT id, is_system, name FROM role_groups WHERE id = ? AND deleted_at IS NULL', [id]);
  if (!rows.length) throw new BusinessError('角色分组不存在');
  if (rows[0].is_system) throw new BusinessError('系统分组不可删除');
  const roleCount = await db.query('SELECT COUNT(*) AS cnt FROM roles WHERE group_id = ? AND deleted_at IS NULL', [id]);
  if (roleCount[0].cnt > 0) throw new BusinessError('分组下还有角色，请先迁移角色');
  await db.execute('UPDATE role_groups SET deleted_at = NOW(), status = ? WHERE id = ?', ['disabled', id]);
  return { id };
}

// ============================================
/**
 * 获取审批类型列表（管理员）
 */
async function getApprovalTypes() {
  const rows = await db.query(
    `SELECT id, type_key, name, icon, sort_order, need_attachment, need_remark,
      form_template, status, created_at, updated_at
     FROM approval_types WHERE deleted_at IS NULL ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(r => ({
    id: r.id,
    typeKey: r.type_key,
    name: r.name,
    icon: r.icon,
    sortOrder: r.sort_order,
    needAttachment: !!r.need_attachment,
    needRemark: !!r.need_remark,
    formTemplate: r.form_template,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * 更新审批类型配置
 */
async function updateApprovalType(id, { name, icon, sortOrder, needAttachment, needRemark, formTemplate, status }) {
  const rows = await db.query('SELECT id FROM approval_types WHERE id = ? AND deleted_at IS NULL', [id]);
  if (rows.length === 0) throw new BusinessError('审批类型不存在');

  const updates = [];
  const params = [];

  if (name !== undefined) { updates.push('name = ?'); params.push(name); }
  if (icon !== undefined) { updates.push('icon = ?'); params.push(icon); }
  if (sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(sortOrder); }
  if (needAttachment !== undefined) { updates.push('need_attachment = ?'); params.push(needAttachment ? 1 : 0); }
  if (needRemark !== undefined) { updates.push('need_remark = ?'); params.push(needRemark ? 1 : 0); }
  if (formTemplate !== undefined) { updates.push('form_template = ?'); params.push(JSON.stringify(formTemplate)); }
  if (status !== undefined) {
    if (!['active', 'disabled'].includes(status)) throw new ValidationError('状态值无效');
    updates.push('status = ?');
    params.push(status);
  }

  if (updates.length === 0) throw new BusinessError('没有需要更新的字段');

  params.push(id);
  await db.execute(`UPDATE approval_types SET ${updates.join(', ')} WHERE id = ?`, params);

  logger.info('更新审批类型', { module: 'ADMIN', typeId: id });
  return { id };
}

/**
 * 管理员删除用户（软删除：设 deleted_at）
 * 不允许删除自己
 */
async function deleteUser(userId) {
  const users = await db.query('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL', [userId]);
  if (users.length === 0) throw new BusinessError('用户不存在');
  await db.execute('UPDATE users SET deleted_at = NOW() WHERE id = ?', [userId]);
  logger.info('管理员删除用户', { module: 'ADMIN', userId: String(userId) });
  return { userId: String(userId), deleted: true };
}

/**
 * 获取系统配置
 */
async function getSystemConfig() {
  const rows = await db.query(
    'SELECT id, config_key, config_value, config_group, description FROM system_config ORDER BY config_group, id'
  );
  return rows.map(r => ({
    id: r.id,
    key: r.config_key,
    value: r.config_value,
    group: r.config_group,
    description: r.description,
  }));
}

/**
 * 更新系统配置
 */
async function updateSystemConfig(configs) {
  if (!Array.isArray(configs) || configs.length === 0) {
    throw new ValidationError('configs 必须为非空数组');
  }

  for (const item of configs) {
    if (!item.key) continue;
    await db.execute(
      `INSERT INTO system_config (config_key, config_value, config_group, description)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), config_group = VALUES(config_group)`,
      [item.key, item.value || '', item.group || 'general', item.description || '']
    );
  }

  logger.info('更新系统配置', { module: 'ADMIN', count: configs.length });
  return { updated: configs.length };
}

module.exports = {
  getUserList, getUserDetail, updateUser, batchImportUsers,
  setAdminRole, toggleUserStatus, setBizTripStatus, batchSetBizTripStatus, createUser, approveUser, inviteUser,
  setUserPassword, deleteUser,
  getDepartmentTree, getDepartmentList, createDepartment, updateDepartment, deleteDepartment,
  getRoleList, getRoleDetail, createRole, updateRole, deleteRole,
  getPermissionList, setRolePermissions,
  getRoleGroups, getRoleGroupDetail, createRoleGroup, updateRoleGroup, deleteRoleGroup,
  getApprovalTypes, updateApprovalType,
  getSystemConfig, updateSystemConfig,
};
