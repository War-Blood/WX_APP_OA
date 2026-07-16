'use strict';

const recordService = require('../services/record.service');
const { success, paginated } = require('../../../../common/utils/response');

async function myRecords(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.body;
    const result = await recordService.myRecords(req.user.userId, { page: Number(page), pageSize: Number(pageSize) });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

async function allRecords(req, res, next) {
  try {
    const { keyword, paperId, status, page = 1, pageSize = 20 } = req.body;
    const result = await recordService.allRecords({ keyword, paperId, status, page: Number(page), pageSize: Number(pageSize) });
    res.json(paginated(result.list, result.total, Number(page), Number(pageSize)));
  } catch (err) { next(err); }
}

async function stats(req, res, next) {
  try {
    const { paperId } = req.body;
    const result = await recordService.stats(paperId);
    res.json(success(result));
  } catch (err) { next(err); }
}

module.exports = { myRecords, allRecords, stats };
