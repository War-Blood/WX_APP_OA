'use strict';

const settingService = require('../services/setting.service');
const { success } = require('../../../common/utils/response');

/**
 * 答题设置控制器
 */

/** 读取答题设置 */
async function get(req, res, next) {
  try {
    const result = await settingService.get();
    res.json(success(result));
  } catch (err) { next(err); }
}

/** 更新答题设置 */
async function update(req, res, next) {
  try {
    const { settings } = req.body;
    const result = await settingService.update(settings);
    res.json(success(result, '设置已保存'));
  } catch (err) { next(err); }
}

module.exports = { get, update };
