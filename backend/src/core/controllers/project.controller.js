'use strict';

const projectService = require('../services/project.service');
const { success, paginated } = require('../../common/utils/response');
const { ValidationError } = require('../../common/utils/errors');

/**
 * 项目控制器
 */

/**
 * POST /api/project/list — 项目列表（分页+搜索）
 */
async function list(req, res, next) {
  try {
    const { page = 1, pageSize = 10, keyword } = req.body;

    const { list: projectList, total } = await projectService.projectList({
      page: Number(page),
      pageSize: Number(pageSize),
      keyword,
    });

    res.json(paginated(projectList, total, Number(page), Number(pageSize)));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/project/detail — 项目详情
 */
async function detail(req, res, next) {
  try {
    const { id } = req.body;

    if (!id) {
      throw new ValidationError('项目名称不能为空');
    }

    const result = await projectService.projectDetail({ id });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/project/stats — 项目统计
 */
async function stats(req, res, next) {
  try {
    const { projectId, period } = req.body;

    const result = await projectService.projectStats({ projectId, period });
    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, detail, stats };
