'use strict';

const approvalService = require('../services/approval.service');
const { success, paginated } = require('../../common/utils/response');

/**
 * 审批控制器
 */

/**
 * 审批列表（分页+筛选）
 * POST /api/approval/list
 * 兼容新旧参数：旧 { status, typeId } / 新 { tab, type }
 */
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 10, status, typeId, tab, type } = req.body;
    const userId = req.user.userId;

    // 参数映射：tab → status, type → typeId (新参数优先于旧参数)
    const mappedStatus = tab !== undefined ? mapTabToStatus(tab) : status;
    const mappedTypeId = type !== undefined ? type : (typeId || undefined);

    const { list: approvalList, total } = await approvalService.list(userId, {
      page: Number(page),
      pageSize: Number(pageSize),
      status: mappedStatus,
      typeId: mappedTypeId,
      tab, // 透传 tab 给 service，用于 'mine' 逻辑
    });

    res.json(paginated(approvalList, total, Number(page), Number(pageSize)));
  } catch (err) {
    next(err);
  }
}

/**
 * tab 参数映射为 status
 * @param {string} tab - pending / mine / done
 * @returns {string|null} 映射后的 status
 */
function mapTabToStatus(tab) {
  const map = {
    'pending': 'pending',
    'mine': null,       // 'mine' 在 service 层特殊处理
    'done': 'approved',
  };
  return map[tab] !== undefined ? map[tab] : undefined;
}

/**
 * 审批详情
 * POST /api/approval/detail
 */
async function detail(req, res, next) {
  try {
    const { id } = req.body;
    const userId = req.user.userId;

    const approval = await approvalService.detail(id, userId);

    res.json(success(approval));
  } catch (err) {
    next(err);
  }
}

/**
 * 创建审批
 * POST /api/approval/create
 * 兼容新旧参数：旧 { approvalTypeId } / 新 { type, approverId, ccIds }
 */
async function create(req, res, next) {
  try {
    const { approvalTypeId, title, formData, attachments, urgent, type, approverId, ccIds } = req.body;
    const userId = req.user.userId;

    const instance = await approvalService.create({
      userId,
      approvalTypeId: approvalTypeId || type, // 兼容新旧参数
      title,
      formData,
      attachments,
      urgent,
      approverId: approverId || null,      // 新增字段
      ccIds: ccIds || [],                  // 新增字段
    });

    res.json(success(instance));
  } catch (err) {
    next(err);
  }
}

/**
 * 审批通过/驳回
 * POST /api/approval/approve
 * 兼容新旧参数：旧 { action: 'approved'/'rejected', comment } / 新 { action: 'approve'/'reject', opinion }
 */
async function approve(req, res, next) {
  try {
    const { id: instanceId, action, comment, opinion } = req.body;
    const userId = req.user.userId;

    // action 映射: 'approve' → 'approved', 'reject' → 'rejected'
    const mappedAction = mapAction(action);
    // comment/opinion 兼容，新参数 opinion 优先
    const mappedComment = comment || opinion || null;

    const result = await approvalService.approve({
      userId,
      instanceId,
      action: mappedAction,
      comment: mappedComment,
    });

    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * action 参数映射
 * @param {string} action - approve / reject / approved / rejected
 * @returns {string} 映射后的 action
 */
function mapAction(action) {
  const map = {
    'approve': 'approved',
    'reject': 'rejected',
  };
  return map[action] || action; // 如果已经是 approved/rejected 则直接使用
}

module.exports = { list, detail, create, approve };
