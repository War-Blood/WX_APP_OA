'use strict';

/**
 * 北京时间日期工具 — 统一使用 UTC+8 避免服务器时区偏移
 */

/**
 * 将 YYYY-MM-DD 字符串解析为北京时间当天 00:00:00 的 Date 对象
 * @param {string} dateStr - 日期字符串，如 "2026-07-06"
 * @returns {Date}
 */
function beijingDate(dateStr) {
  if (!dateStr) return new Date();
  return new Date(dateStr + 'T00:00:00+08:00');
}

/**
 * 返回北京时间今天的日期字符串 YYYY-MM-DD
 * @returns {string}
 */
function beijingToday() {
  const now = new Date();
  // 用 Tokyo/Shanghai 时区偏移：UTC+8 = 8*60 min
  const offset = now.getTimezoneOffset() + 480; // 转为 UTC+8 的分钟偏移
  const bj = new Date(now.getTime() + offset * 60000);
  return bj.toISOString().slice(0, 10);
}

/**
 * 北京时间今天 00:00:00 的 Date 对象
 * @returns {Date}
 */
function beijingNow() {
  return beijingDate(beijingToday());
}

module.exports = { beijingDate, beijingToday, beijingNow };
