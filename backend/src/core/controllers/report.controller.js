'use strict';

const reportService = require('../services/report.service');
const statsService = require('../services/stats.service');
const db = require('../../common/config/database');
const { success, fail, paginated } = require('../../common/utils/response');
const { ValidationError } = require('../../common/utils/errors');
const { ErrorCode } = require('../../common/utils/constants');

/**
 * 日报控制器 v2.0
 */

/**
 * 自动补充 entryDate（从 users 表查询入场日期）
 * @param {number} userId - 用户 ID
 * @param {string} [entryDate] - 前端传入的 entryDate
 * @returns {Promise<string|null>} 解析后的 entryDate
 */
async function resolveEntryDate(userId, entryDate) {
  if (entryDate) return entryDate;

  const [user] = await db.query(
    'SELECT entry_date FROM users WHERE id = ?',
    [userId]
  );
  if (user && user.entry_date) {
    return typeof user.entry_date === 'string'
      ? user.entry_date.slice(0, 10)
      : user.entry_date.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * 工作日报（office）归一化：固定业务字段 + 清理公出专属字段
 * - project 固定「公司日报」、todayWorkType 固定「公司」
 * - area 从 system_config 配置读取（非硬编码），未配置则为空
 * - 公出日志/补公出的残留字段一律清空，避免旧客户端携带的默认值落库
 * @param {Object} data - 待归一化的提交数据
 * @returns {Promise<void>}
 */
async function normalizeOfficeReport(data) {
  data.project = '公司日报';
  data.relatedParty = '';
  if (!data.todayWorkType) data.todayWorkType = '公司';
  // 清理公出专属字段（前端 A/B 策略的兜底，防旧版本客户端残留值落库）
  data.workContent = '';
  data.machineModel = '';
  data.entryDate = '';
  data.initialBizTripDate = '';
  data.tomorrowWorkType = '';
  data.requiredQty = undefined;
  data.completedQty = undefined;
  data.workerIds = [];
  data.supplementDate = '';
  data.supplementReason = '';
  // area 从系统配置接口读取（system_config.office_report_area），未配置则留空
  const [cfgRow] = await db.query(
    'SELECT config_value FROM system_config WHERE config_key = ?',
    ['office_report_area']
  );
  data.area = (cfgRow && cfgRow.config_value) || '';
}

// ==============================
// 基础 CRUD
// ==============================

/**
 * 日报列表（分页+筛选）
 * POST /api/report/list
 */
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 50, status, reportType, workType, startDate, endDate, keyword, userId: requestedUserId } = req.body;
    const role = req.user.role;
    // 任何用户均可查询自己的记录（前端回填「最近一次填写」用）；
    // 未显式传 userId（或传的不是自己）时按原规则：admin/superadmin 看全部，普通用户只看自己
    let userId;
    if (requestedUserId !== undefined && Number(requestedUserId) === req.user.userId) {
      userId = req.user.userId;
    } else {
      userId = (role === 'admin' || role === 'superadmin') ? 0 : req.user.userId;
    }

    const { list: reportList, total } = await reportService.list(userId, {
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      reportType,
      workType,
      startDate,
      endDate,
      keyword,
    });

    res.json(paginated(reportList, total, Number(page), Number(pageSize)));
  } catch (err) {
    next(err);
  }
}

/**
 * 日报详情
 * POST /api/report/detail
 */
async function detail(req, res, next) {
  try {
    const { id } = req.body;
    const report = await reportService.detail(id);

    res.json(success(report));
  } catch (err) {
    next(err);
  }
}

/**
 * 提交日报（v2.0 改造）
 * POST /api/report/submit
 *
 * 支持三种 reportType: biz_trip / biz_trip_supplement / office
 * 自动补充 entryDate（从 users 表查）和 initialBizTripDate（默认同 entryDate）
 */
async function submit(req, res, next) {
  try {
    const userId = req.user.userId;
    const data = { ...req.body };

    // ---- 参数校验（按 reportType 区分必填字段） ----
    const reportType = data.reportType || 'biz_trip';

    if (!['biz_trip', 'biz_trip_supplement', 'office'].includes(reportType)) {
      throw new ValidationError(`无效的日志类型: ${reportType}`);
    }

    if (!data.reportDate) {
      throw new ValidationError('日报日期不能为空');
    }

    // 工作日报（office）无需工作类型；公出/补公出必填
    const validWorkTypes = ['工作（陆）', '工作（海）', '待工', '在途', '请假'];
    if (reportType !== 'office') {
      // 旧版兼容: 未传 todayWorkType 时默认「工作（陆）」
      if (!data.todayWorkType) {
        data.todayWorkType = '工作（陆）';
      }
      if (!validWorkTypes.includes(data.todayWorkType)) {
        throw new ValidationError(`无效的工作类型: ${data.todayWorkType}`);
      }
    }

    // 工作日报（office）：固定默认值 + 清理公出专属字段（防残留值落库）
    if (reportType === 'office') {
      await normalizeOfficeReport(data);
    } else {
      // ---- 自动补充 entryDate（仅公出/补公出；工作日报无入场概念） ----
      data.entryDate = await resolveEntryDate(userId, data.entryDate);

      // ---- 自动补充 initialBizTripDate（默认同 entryDate） ----
      if (!data.initialBizTripDate && data.entryDate) {
        data.initialBizTripDate = data.entryDate;
      }
    }

    const isLeave = data.todayWorkType === '请假';

    // 请假：project 默认填类型名，跳过 project/area 必填校验
    if (isLeave) {
      if (!data.project) {
        data.project = data.todayWorkType;
      }
    }

    if (reportType === 'biz_trip' || reportType === 'biz_trip_supplement') {
      // 请假时 project/area 可为空
      if (!isLeave) {
        if (!data.project) {
          throw new ValidationError('项目名称不能为空');
        }
        if (!data.area) {
          throw new ValidationError('项目区域不能为空');
        }
        if (!data.initialBizTripDate) {
          throw new ValidationError('初始出差时间不能为空');
        }
        if (!data.workContent) {
          throw new ValidationError('工作内容不能为空');
        }
        if (data.requiredQty == null || data.requiredQty === '') {
          throw new ValidationError('需求数量不能为空');
        }
        if (Number(data.requiredQty) <= 0) {
          throw new ValidationError('需求数量必须大于0');
        }
        if (data.completedQty == null || data.completedQty === '') {
          throw new ValidationError('完成数量不能为空');
        }
        if (Number(data.completedQty) > Number(data.requiredQty)) {
          throw new ValidationError('完成数量不能大于需求数量');
        }
      }
      if (!data.workerIds || !Array.isArray(data.workerIds) || data.workerIds.length === 0) {
        throw new ValidationError('作业人员不能为空');
      }

      if (reportType === 'biz_trip_supplement') {
        if (!data.supplementDate) {
          throw new ValidationError('补录目标日期不能为空');
        }
        if (!data.supplementReason) {
          throw new ValidationError('补录原因不能为空');
        }
      }
    }

    // 公出/补公出的 entryDate / initialBizTripDate 补充已在上面分支完成
    // （office 已在 normalizeOfficeReport 中清空，避免再次被 users.entry_date 污染）

    const result = await reportService.submit(data, userId);

    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * 保存草稿
 * POST /api/report/draft
 */
async function saveDraft(req, res, next) {
  try {
    const userId = req.user.userId;
    const data = { ...req.body, status: 'draft' };

    if (!data.reportDate) {
      throw new ValidationError('日报日期不能为空');
    }

    // 工作日报草稿同样归一化（清理公出残留字段），且不补充 entryDate
    if (data.reportType === 'office') {
      await normalizeOfficeReport(data);
    } else {
      // 自动补充 entryDate
      data.entryDate = await resolveEntryDate(userId, data.entryDate);
    }

    const result = await reportService.submit(data, userId);

    res.json(success({ reportId: result.reportId }, '草稿已保存'));
  } catch (err) {
    next(err);
  }
}

/**
 * 获取草稿
 * GET /api/report/draft
 */
async function getDraft(req, res, next) {
  try {
    let { reportDate } = req.query;
    try { const parsed = JSON.parse(reportDate); reportDate = parsed.reportDate || reportDate; } catch {}
    const userId = req.user.userId;

    const draft = await reportService.getDraft(userId, reportDate);
    res.json(success(draft));
  } catch (err) {
    next(err);
  }
}

/**
 * 删除日报
 * POST /api/report/delete
 */
async function deleteReport(req, res, next) {
  try {
    const { id } = req.body;
    const role = req.user.role;
    const userId = (role === 'admin' || role === 'superadmin') ? 0 : req.user.userId;

    await reportService.deleteReport(id, userId);
    res.json(success(null, '删除成功'));
  } catch (err) {
    next(err);
  }
}

/**
 * 管理员编辑公出日志
 * POST /api/report/update
 */
async function update(req, res, next) {
  try {
    const { reportId } = req.body;

    if (!reportId) {
      throw new ValidationError('reportId 不能为空');
    }

    const editableKeys = [
      'project', 'area', 'reportDate', 'todayWorkType', 'workContent',
      'machineModel', 'workers', 'relatedParty', 'remark',
      'todayWork', 'tomorrowPlan', 'entryDate', 'initialBizTripDate',
      'requiredQty', 'completedQty', 'supplementDate', 'supplementReason',
      'personalBizTripDays', 'bizTripDays', 'issues', 'content', 'reportType',
    ];

    const updateData = {};
    for (const key of editableKeys) {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    }

    // todayWorkType 归一化 + 枚举校验（工作日报 office 无工作类型，跳过）
    if (updateData.todayWorkType && updateData.reportType !== 'office') {
      // 旧版简称归一化（与 stats.service.js 的 wtNormalize 保持一致）
      if (updateData.todayWorkType === '工作' || updateData.todayWorkType === '作业') {
        updateData.todayWorkType = '工作（陆）';
      }
      const validWorkTypes = ['工作（陆）', '工作（海）', '待工', '在途', '请假'];
      if (!validWorkTypes.includes(updateData.todayWorkType)) {
        throw new ValidationError(`无效的工作类型: ${updateData.todayWorkType}`);
      }
    }

    const meta = {
      ip: req.ip || req.connection?.remoteAddress || null,
      ua: req.headers['user-agent'] || null,
    };

    const result = await reportService.updateReport(
      reportId, updateData, req.user.userId, meta
    );

    res.json(success(result, result.changes.length > 0 ? '修改成功' : '无变更'));
  } catch (err) {
    next(err);
  }
}

// ==============================
// 代填检测（新增）
// ==============================

/**
 * 检查当日是否已被代填
 * POST /api/report/check-duplicate
 */
async function checkDuplicate(req, res, next) {
  try {
    const { userId, reportDate } = req.body;

    if (!userId) {
      throw new ValidationError('userId 不能为空');
    }
    if (!reportDate) {
      throw new ValidationError('reportDate 不能为空');
    }

    const result = await reportService.checkDuplicate(userId, reportDate);

    if (!result.canSubmit) {
      // code 2001 表示已被代填
      res.json({
        code: ErrorCode.REPORT_SUBSTITUTED,
        message: `当日公出日志已由 ${result.submittedBy} 代填`,
        data: { submittedBy: result.submittedBy, reportId: result.reportId },
      });
    } else {
      res.json(success({ canSubmit: true }));
    }
  } catch (err) {
    next(err);
  }
}

/**
 * 查询用户当日日报状态
 * POST /api/report/today-status
 */
async function todayStatus(req, res, next) {
  try {
    const { reportDate } = req.body;
    const userId = req.user.userId;

    if (!reportDate) {
      throw new ValidationError('reportDate 不能为空');
    }

    const result = await reportService.getTodayStatus(userId, reportDate);

    if (result.status === 'substituted') {
      res.json({
        code: ErrorCode.REPORT_SUBSTITUTED,
        message: `当日公出日志已由 ${result.submittedBy} 代填`,
        data: result,
      });
    } else {
      res.json(success(result));
    }
  } catch (err) {
    next(err);
  }
}

// ==============================
// 补公出日志审核（新增）
// ==============================

/**
 * 补公出日志待审核列表
 * POST /api/report/pending-reviews
 */
async function pendingReviews(req, res, next) {
  try {
    const { status: reviewStatus = 'pending', page = 1, pageSize = 20 } = req.body;

    if (!['pending', 'reviewed', 'all'].includes(reviewStatus)) {
      throw new ValidationError('status 仅支持 pending/reviewed/all');
    }

    const { list, total } = await reportService.getPendingReviews({
      status: reviewStatus,
      page: Number(page),
      pageSize: Number(pageSize),
    });

    res.json(paginated(list, total, Number(page), Number(pageSize)));
  } catch (err) {
    next(err);
  }
}

/**
 * 补公出日志审核判定
 * POST /api/report/supplement-review
 */
async function supplementReview(req, res, next) {
  try {
    const { reportId, decision, comment } = req.body;

    if (!reportId) {
      throw new ValidationError('reportId 不能为空');
    }
    if (!['special', 'forget'].includes(decision)) {
      throw new ValidationError('decision 仅支持 special 或 forget');
    }

    const result = await reportService.supplementReview(reportId, decision, comment, req.user.userId);
    res.json(success(result, '审核完成'));
  } catch (err) {
    next(err);
  }
}

// ==============================
// 统计看板（新增）
// ==============================

/**
 * 统计看板 — 三种 scope
 * POST /api/report/stats
 */
async function stats(req, res, next) {
  try {
    const { scope, userId } = req.body;

    if (!['user', 'all', 'project'].includes(scope)) {
      throw new ValidationError('scope 仅支持 user/all/project');
    }

    const result = await statsService.getStats(scope, { userId });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ==============================
// 管理层看板 — 当日状态（新增）
// ==============================

/**
 * 全员当日状态
 * POST /api/report/daily-status  body: { date?, statKey? }
 */
async function dailyStatus(req, res, next) {
  try {
    const { date, statKey } = req.body;
    const viewParams = { role: req.user.role, userId: req.user.userId };
    const result = await statsService.getDailyStatus(date, viewParams, statKey);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * 明日计划状态
 * POST /api/report/tomorrow-status  body: { date?, statKey? }
 */
async function tomorrowStatus(req, res, next) {
  try {
    const { date, statKey } = req.body;
    const viewParams = { role: req.user.role, userId: req.user.userId };
    const result = await statsService.getTomorrowStatus(date, viewParams, statKey);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ==============================
// 管理层看板 — 月度工作占比（新增）
// ==============================

/**
 * 月度工作占比
 * POST /api/report/monthly-summary
 */
async function monthlySummary(req, res, next) {
  try {
    const { userId, month } = req.body;

    // 管理员看全员时需要传 userId，员工看自己时可用当前登录用户
    const targetUserId = userId || req.user.userId;
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new ValidationError('month 格式必须为 YYYY-MM');
    }

    const result = await statsService.getMonthlySummary(targetUserId, targetMonth);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ==============================
// 同组日志列表（新增）
// ==============================

/**
 * 同组日志列表
 * POST /api/report/team-logs
 */
async function teamLogs(req, res, next) {
  try {
    const { userId, days = 7 } = req.body;

    if (!userId) {
      throw new ValidationError('userId 不能为空');
    }

    const result = await reportService.getTeamLogs(userId, Number(days));
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

// ==============================
// 旧版兼容
// ==============================

/**
 * 获取作业人员名单（去重）
 * GET /api/report/workerList
 */
async function workerList(req, res, next) {
  try {
    const names = await reportService.getWorkerList();
    res.json(success(names));
  } catch (err) { next(err); }
}

/**
 * 人员统计看板
 * POST /api/report/workerStats
 */
async function workerStats(req, res, next) {
  try {
    const { keyword } = req.body;
    const result = await reportService.getWorkerStats({ keyword, viewId: req.body.viewId, role: req.user.role, userId: req.user.userId });
    res.json(success({ list: result.list, total: result.total }));
  } catch (err) { next(err); }
}

/**
 * 导出 CSV
 * POST /api/report/export
 */
async function exportCSV(req, res, next) {
  try {
    const { status, reportType, workType, startDate, endDate, keyword, worker } = req.body;
    const csv = await reportService.exportCSV({ status, reportType, workType, startDate, endDate, keyword, worker });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
    res.send('﻿' + csv);
  } catch (err) { next(err); }
}

/**
 * 导出月度考勤矩阵
 * POST /api/report/export-attendance
 */
async function exportAttendance(req, res, next) {
  try {
    const { month } = req.body;
    const csv = await reportService.exportAttendanceCSV(month);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${month || 'month'}.csv`);
    res.send('﻿' + csv);
  } catch (err) { next(err); }
}

/**
 * 导出到企业微信智能表格
 * POST /api/report/export-wecom-sheet
 */
async function exportToWecomSheet(req, res, next) {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.json(fail('请选择开始和结束日期'));
    }
    const result = await reportService.exportToWecomSheet(startDate, endDate);
    res.json(success(result, `成功导出 ${result.totalRecords} 条记录到企业微信智能表格`));
  } catch (err) { next(err); }
}

/**
 * 导出员工月度状态看板（横排交叉表）
 * POST /api/report/export-status-board
 */
async function exportStatusBoard(req, res, next) {
  try {
    const { month, restDays } = req.body;
    if (!month) { res.status(400).json({ code: 1, message: '请选择月份' }); return; }
    const { buffer, filename } = await reportService.exportStatusBoardCSV(month, restDays);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="' + encodeURIComponent(filename) + '"');
    res.send(buffer);
  } catch (err) { next(err); }
}

/**
 * 恢复已删除的日报
 * POST /api/report/restore
 */
async function restoreReport(req, res, next) {
  try {
    const { id } = req.body;
    const role = req.user.role;
    const userId = (role === 'admin' || role === 'superadmin') ? 0 : req.user.userId;

    await reportService.restoreReport(id, userId);
    res.json(success(null, '已恢复'));
  } catch (err) {
    next(err);
  }
}

/**
 * 回收站列表（仅管理员）
 * POST /api/report/deleted-list
 */
async function listDeleted(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.body;
    const result = await reportService.listDeleted({ page, pageSize });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * 彻底删除回收站中的日报（仅管理员）
 * POST /api/report/purge
 */
async function purgeReport(req, res, next) {
  try {
    const { id } = req.body;
    if (!id) {
      throw new ValidationError('id 不能为空');
    }
    await reportService.purgeReport(id);
    res.json(success(null, '已彻底删除'));
  } catch (err) {
    next(err);
  }
}

async function schedulePreview(req, res, next) {
  try {
    const { month } = req.body;
    if (!month) { res.status(400).json({ code: 1, message: '请选择月份' }); return; }
    const result = await reportService.schedulePreview(month);
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = {
  list,
  detail,
  submit,
  saveDraft,
  getDraft,
  deleteReport,
  restoreReport,
  listDeleted,
  purgeReport,
  update,
  checkDuplicate,
  todayStatus,
  pendingReviews,
  supplementReview,
  stats,
  dailyStatus,
  tomorrowStatus,
  monthlySummary,
  teamLogs,
  workerList,
  workerStats,
  exportCSV,
  exportAttendance,
  exportToWecomSheet,
  exportStatusBoard,
  schedulePreview,
};
