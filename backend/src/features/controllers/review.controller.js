'use strict';

const reviewService = require('../services/review.service');
const { success, paginated } = require('../../common/utils/response');
const { ValidationError } = require('../../common/utils/errors');

/**
 * 审核控制器
 * @module reviewController
 */

/**
 * 审核列表
 * POST /api/project/reviewList
 */
async function reviewList(req, res, next) {
  try {
    const { page = 1, pageSize = 20, status, keyword, startDate, endDate } = req.body;

    const { list, total, stats } = await reviewService.reviewList({
      page: Number(page),
      pageSize: Number(pageSize),
      status,
      keyword,
      startDate,
      endDate,
    });

    res.json({
      code: 0,
      message: 'success',
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)) || 0,
        stats,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 审核详情
 * POST /api/project/reviewDetail
 */
async function reviewDetail(req, res, next) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        code: 1001,
        message: '参数校验失败',
        data: { field: 'id', message: '日报ID不能为空' },
      });
    }

    const report = await reviewService.reviewDetail(Number(id));

    res.json(success(report));
  } catch (err) {
    next(err);
  }
}

/**
 * 审核操作（通过/驳回）
 * POST /api/project/reviewAction
 */
async function reviewAction(req, res, next) {
  try {
    const { id, action, opinion } = req.body;
    const reviewerId = req.user.userId;

    if (!id) {
      return res.status(400).json({
        code: 1001,
        message: '参数校验失败',
        data: { field: 'id', message: '日报ID不能为空' },
      });
    }

    if (!action) {
      return res.status(400).json({
        code: 1001,
        message: '参数校验失败',
        data: { field: 'action', message: '审核操作不能为空' },
      });
    }

    const result = await reviewService.reviewAction({
      reportId: Number(id),
      reviewerId,
      action,
      opinion,
    });

    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * 批量审核日报
 * POST /api/project/reviewBatch
 */
async function reviewBatch(req, res, next) {
  try {
    const { ids, action, opinion } = req.body;
    const reviewerId = req.user.userId;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('请选择待审核日报');
    }
    if (!action) {
      throw new ValidationError('审核操作不能为空');
    }

    const result = await reviewService.reviewBatch({
      ids,
      reviewerId,
      action,
      opinion,
    });

    res.json(success(result, `已处理 ${result.processed} 条日报`));
  } catch (err) {
    next(err);
  }
}

/**
 * 审核统计
 * POST /api/project/reviewStats
 */
async function reviewStats(req, res, next) {
  try {
    const { period = 'week' } = req.body;

    const stats = await reviewService.reviewStats(period);

    res.json(success(stats));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  reviewList,
  reviewDetail,
  reviewAction,
  reviewBatch,
  reviewStats,
};
