'use strict';

const db = require('../../common/config/database');
const { NotFoundError, BusinessError, ForbiddenError } = require('../../common/utils/errors');

/**
 * 审批服务
 */

const STATUS_TEXT_MAP = {
  pending: '审批中',
  approved: '已通过',
  rejected: '已驳回',
};

const ACTION_TEXT_MAP = {
  approved: '通过',
  rejected: '驳回',
  pending: '待处理',
};

/**
 * 将 approval_instances 行（snake_case）映射为 camelCase 格式
 * @param {Object} row - 数据库原始行
 * @returns {Object} 格式化后的审批项
 */
function formatApprovalItem(row) {
  return {
    id: row.id,
    title: row.title || '',
    type: row.approval_type_id != null ? String(row.approval_type_id) : '',
    applicantId: row.applicant_id != null ? String(row.applicant_id) : '',
    applicant: row.applicantName || '',
    applicantDept: row.applicantDept || '',
    date: row.created_at || '',
    status: row.status,
    statusText: STATUS_TEXT_MAP[row.status] || row.status,
    urgent: row.urgent === 1 || row.urgent === true,
    currentNodeId: row.current_node_id != null ? String(row.current_node_id) : null,
    currentApproverId: row.current_approver_id != null ? String(row.current_approver_id) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 将 form_data 安全解析为对象
 */
function parseFormData(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
}

/**
 * 将审批节点映射为时间线格式
 * @param {Array} nodes - 审批节点行数组
 * @returns {Array} 时间线数组
 */
function formatTimeline(nodes) {
  return nodes.map((node) => ({
    nodeId: node.id,
    nodeOrder: node.node_order,
    approverId: node.approver_id != null ? String(node.approver_id) : null,
    approverName: node.approverName || '',
    status: node.action || 'pending',
    remark: node.comment || '',
    time: node.acted_at || '',
    action: node.action || null,
  }));
}

/**
 * 审批列表（分页+筛选）
 * @param {number} userId - 用户 ID
 * @param {Object} params - 查询参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页条数
 * @param {string} [params.status] - 状态筛选
 * @param {number} [params.typeId] - 审批类型 ID 筛选
 * @param {string} [params.tab] - tab 筛选 (pending/mine/done)，'mine' 时只查本人发起
 * @returns {Promise<{list: Array, total: number}>}
 */
async function list(userId, { page, pageSize, status, typeId, tab }) {
  let whereClause;
  const params = [];

  // tab='mine' 时：只查当前用户发起的审批
  if (tab === 'mine') {
    whereClause = 'WHERE ai.applicant_id = ?';
    params.push(userId);
  } else {
    whereClause = 'WHERE (ai.applicant_id = ? OR ai.id IN (SELECT afn.instance_id FROM approval_flow_nodes afn WHERE afn.approver_id = ?))';
    params.push(userId, userId);
  }

  if (status) {
    whereClause += ' AND ai.status = ?';
    params.push(status);
  }
  if (typeId) {
    whereClause += ' AND ai.approval_type_id = ?';
    params.push(typeId);
  }

  // 查询总记录数
  const countSql = `SELECT COUNT(*) AS total FROM approval_instances ai ${whereClause}`;
  const countRows = await db.query(countSql, params);
  const total = countRows[0].total;

  // 查询分页数据 — JOIN users 获取申请人信息
  const offset = (page - 1) * pageSize;
  const dataSql = `
    SELECT
      ai.*,
      afn.approver_id AS current_approver_id,
      u.nickname AS applicantName,
      u.department AS applicantDept
    FROM approval_instances ai
    LEFT JOIN approval_flow_nodes afn ON ai.current_node_id = afn.id
    LEFT JOIN users u ON ai.applicant_id = u.id
    ${whereClause}
    ORDER BY ai.created_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = await db.query(dataSql, [...params, pageSize, offset]);

  // 字段映射：snake_case → camelCase
  const mappedList = rows.map((row) => formatApprovalItem(row));

  return { list: mappedList, total };
}

/**
 * 审批详情
 * @param {number} id - 审批实例 ID
 * @param {number} userId - 用户 ID
 * @returns {Promise<Object>}
 */
async function detail(id, userId) {
  // 查询审批实例基本信息 + 申请人信息
  const instances = await db.query(
    `SELECT
      ai.*,
      afn.approver_id AS current_approver_id,
      u.nickname AS applicantName,
      u.department AS applicantDept
     FROM approval_instances ai
     LEFT JOIN approval_flow_nodes afn ON ai.current_node_id = afn.id
     LEFT JOIN users u ON ai.applicant_id = u.id
     WHERE ai.id = ? AND (ai.applicant_id = ? OR ai.id IN (SELECT instance_id FROM approval_flow_nodes WHERE approver_id = ?))`,
    [id, userId, userId]
  );

  if (instances.length === 0) {
    throw new NotFoundError('审批不存在');
  }

  const instance = instances[0];

  // 查询审批流节点历史 — JOIN users 获取审批人名称
  const nodes = await db.query(
    `SELECT afn.*, u.nickname AS approverName
     FROM approval_flow_nodes afn
     LEFT JOIN users u ON afn.approver_id = u.id
     WHERE afn.instance_id = ?
     ORDER BY afn.node_order ASC`,
    [id]
  );

  // 组装输出：基础信息（camelCase）+ formData（已解析）+ timeline
  const base = formatApprovalItem(instance);

  return {
    ...base,
    formData: parseFormData(instance.form_data),
    attachments: instance.attachments ? parseFormData(instance.attachments) : [],
    timeline: formatTimeline(nodes),
  };
}

/**
 * 创建审批
 * @param {Object} data - 审批数据
 * @param {number} data.userId - 申请人 ID
 * @param {number} data.approvalTypeId - 审批类型 ID
 * @param {string} data.title - 审批标题
 * @param {Object} data.formData - 表单数据
 * @param {Array} [data.attachments] - 附件列表
 * @param {boolean} [data.urgent] - 是否加急
 * @param {number} [data.approverId] - 审批人 ID（新增）
 * @param {Array} [data.ccIds] - 抄送人 ID 列表（新增）
 * @returns {Promise<Object>}
 */
async function create({ userId, approvalTypeId, title, formData, attachments, urgent, approverId, ccIds }) {
  const now = new Date();

  // 使用事务：插入审批实例 + 创建初始审批节点 + 写入抄送关系
  const result = await db.transaction(async (conn) => {
    // 插入审批实例
    const [instanceResult] = await conn.execute(
      `INSERT INTO approval_instances (applicant_id, approval_type_id, title, form_data, attachments, urgent, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        userId,
        approvalTypeId,
        title,
        typeof formData === 'string' ? formData : JSON.stringify(formData),
        attachments ? (typeof attachments === 'string' ? attachments : JSON.stringify(attachments)) : null,
        urgent ? 1 : 0,
        now,
        now,
      ]
    );

    const instanceId = instanceResult.insertId;

    // 创建初始审批节点（node_order=1），使用 approverId（如提供）
    const [nodeResult] = await conn.execute(
      `INSERT INTO approval_flow_nodes (instance_id, node_order, approver_id, created_at)
       VALUES (?, 1, ?, ?)`,
      [instanceId, approverId || null, now]
    );

    const nodeId = nodeResult.insertId;

    // 更新实例的 current_node_id
    await conn.execute(
      'UPDATE approval_instances SET current_node_id = ? WHERE id = ?',
      [nodeId, instanceId]
    );

    // 如果传了 ccIds，写入抄送关系表
    if (ccIds && Array.isArray(ccIds) && ccIds.length > 0) {
      const ccValues = ccIds.map(ccUserId =>
        `(${instanceId}, ${Number(ccUserId)}, '${now.toISOString().slice(0, 19).replace('T', ' ')}')`
      ).join(',');
      await conn.execute(
        `INSERT INTO approval_cc (instance_id, user_id, created_at) VALUES ${ccValues}`
      );
    }

    // 返回创建的实例（已映射格式）
    const [rows] = await conn.query(
      `SELECT ai.*, u.nickname AS applicantName, u.department AS applicantDept
       FROM approval_instances ai
       LEFT JOIN users u ON ai.applicant_id = u.id
       WHERE ai.id = ?`,
      [instanceId]
    );

    return formatApprovalItem(rows[0]);
  });

  return result;
}

/**
 * 审批通过/驳回
 * @param {Object} data - 审批操作数据
 * @param {number} data.userId - 审批人 ID
 * @param {number} data.instanceId - 审批实例 ID
 * @param {string} data.action - 操作：approved | rejected
 * @param {string} [data.comment] - 审批意见
 * @returns {Promise<Object>}
 */
async function approve({ userId, instanceId, action, comment }) {
  // 校验 action 参数
  if (!['approved', 'rejected'].includes(action)) {
    throw new BusinessError('审批操作无效，仅支持 approved 或 rejected');
  }

  // 使用事务处理审批操作
  const result = await db.transaction(async (conn) => {
    // 查询当前审批实例
    const [instances] = await conn.query(
      'SELECT * FROM approval_instances WHERE id = ?',
      [instanceId]
    );

    if (instances.length === 0) {
      throw new NotFoundError('审批不存在');
    }

    const instance = instances[0];

    if (instance.status !== 'pending') {
      throw new BusinessError('审批已处理，请勿重复操作');
    }

    // 查询当前待审批节点
    const [nodes] = await conn.query(
      'SELECT * FROM approval_flow_nodes WHERE instance_id = ? AND approver_id = ? AND action IS NULL ORDER BY node_order ASC LIMIT 1',
      [instanceId, userId]
    );

    if (nodes.length === 0) {
      throw new ForbiddenError('您不是当前审批人，无权操作');
    }

    const currentNode = nodes[0];
    const now = new Date();

    // 更新当前节点：审批结果
    await conn.execute(
      'UPDATE approval_flow_nodes SET action = ?, comment = ?, acted_at = ? WHERE id = ?',
      [action, comment || null, now, currentNode.id]
    );

    if (action === 'rejected') {
      // 驳回：更新实例状态为 rejected
      await conn.execute(
        'UPDATE approval_instances SET status = ?, updated_at = ? WHERE id = ?',
        ['rejected', now, instanceId]
      );
    } else {
      // 通过：检查是否有下一节点
      const [nextNodes] = await conn.query(
        'SELECT id FROM approval_flow_nodes WHERE instance_id = ? AND node_order > ? ORDER BY node_order ASC LIMIT 1',
        [instanceId, currentNode.node_order]
      );

      if (nextNodes.length === 0) {
        // 没有下一节点：审批完成
        await conn.execute(
          'UPDATE approval_instances SET status = ?, current_node_id = NULL, updated_at = ? WHERE id = ?',
          ['approved', now, instanceId]
        );
      } else {
        // 有下一节点：流转到下一节点
        await conn.execute(
          'UPDATE approval_instances SET current_node_id = ?, updated_at = ? WHERE id = ?',
          [nextNodes[0].id, now, instanceId]
        );
      }
    }

    // 返回更新后的审批实例（已映射格式）
    const [updatedInstances] = await conn.query(
      `SELECT
        ai.*,
        afn.approver_id AS current_approver_id,
        u.nickname AS applicantName,
        u.department AS applicantDept
       FROM approval_instances ai
       LEFT JOIN approval_flow_nodes afn ON ai.current_node_id = afn.id
       LEFT JOIN users u ON ai.applicant_id = u.id
       WHERE ai.id = ?`,
      [instanceId]
    );

    return formatApprovalItem(updatedInstances[0]);
  });

  return result;
}

module.exports = { list, detail, create, approve };
