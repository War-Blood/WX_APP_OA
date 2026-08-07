'use strict';

const db = require('../../../common/config/database');
const { NotFoundError } = require('../../../common/utils/errors');
const examService = require('./exam.service');

/**
 * 答题记录服务 — 我的/全员/详情/导出/统计
 */

/**
 * 我的答题记录(考试/模拟; 练习记录已删除)
 * @param {number} userId - 用户ID
 * @param {Object} opts - { page, pageSize }
 * @returns {Promise<Object>} { list, total }
 */
async function myRecords(userId, { page = 1, pageSize = 20 }) {
  const offset = (page - 1) * pageSize;
  const [{ total }] = await db.query(
    "SELECT COUNT(*) AS total FROM exam_records WHERE user_id = ? AND mode IN ('exam','mock')", [userId]
  );
  const rows = await db.query(
    `SELECT r.*, c.name AS categoryName, p.title AS paperTitle
     FROM exam_records r
     LEFT JOIN exam_categories c ON r.category_id = c.id
     LEFT JOIN exam_papers p ON r.paper_id = p.id
     WHERE r.user_id = ? AND r.mode IN ('exam','mock')
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [userId, pageSize, offset]
  );
  return { list: rows.map(formatRow), total };
}

/**
 * 全员答题记录(管理员)
 * @param {Object} opts - { keyword?, categoryId?, mode?, page?, pageSize? }
 * @returns {Promise<Object>} { list, total }
 */
async function allRecords({ keyword, categoryId, mode, page = 1, pageSize = 20 }) {
  const conditions = ["r.mode IN ('exam','mock')"];
  const params = [];
  if (categoryId) { conditions.push('r.category_id = ?'); params.push(categoryId); }
  if (mode) { conditions.push('r.mode = ?'); params.push(mode); }
  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.user_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const where = 'WHERE ' + conditions.join(' AND ');
  const offset = (page - 1) * pageSize;

  const [{ total }] = await db.query(
    `SELECT COUNT(*) AS total FROM exam_records r JOIN users u ON r.user_id = u.id ${where}`, params
  );
  const rows = await db.query(
    `SELECT r.*, c.name AS categoryName, p.title AS paperTitle, u.nickname AS userName, d.name AS departmentName
     FROM exam_records r
     JOIN users u ON r.user_id = u.id
     LEFT JOIN exam_categories c ON r.category_id = c.id
     LEFT JOIN exam_papers p ON r.paper_id = p.id
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  return { list: rows.map(formatRow), total };
}

/**
 * 单条记录详情(逐题判分, 供结果页渲染)
 * @param {number} recordId - 记录ID
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 记录 + 逐题详情
 */
async function detail(recordId, userId) {
  const [record] = await db.query(
    `SELECT r.*, c.name AS categoryName, p.title AS paperTitle
     FROM exam_records r
     LEFT JOIN exam_categories c ON r.category_id = c.id
     LEFT JOIN exam_papers p ON r.paper_id = p.id
     WHERE r.id = ? AND r.user_id = ?`,
    [recordId, userId]
  );
  if (!record) throw new NotFoundError('答题记录不存在');
  const { score, totalScore, details } = examService.gradeRecord(record);
  return {
    recordId: record.id, categoryId: record.category_id, categoryName: record.categoryName || '',
    paperId: record.paper_id, paperTitle: record.paperTitle || '',
    mode: record.mode, score, totalScore, useTime: record.use_time,
    status: record.status, startTime: record.start_time, endTime: record.end_time,
    details,
  };
}

/**
 * 统计看板(管理员): 人数/记录数/平均分/通过率/分类分布
 * @param {Object} opts - { categoryId? }
 * @returns {Promise<Object>} 统计结果
 */
async function overview({ categoryId } = {}) {
  const conditions = ["status IN ('submitted','timeout')", "score IS NOT NULL"];
  const params = [];
  if (categoryId) { conditions.push('category_id = ?'); params.push(categoryId); }
  const where = 'WHERE ' + conditions.join(' AND ');

  const [summary] = await db.query(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT user_id) AS people, AVG(score) AS avgScore
     FROM exam_records ${where}`,
    params
  );
  const passCountRow = await db.query(
    `SELECT COUNT(*) AS cnt FROM exam_records ${where} AND score >= total_score`, params
  );
  const byCategory = await db.query(
    `SELECT c.id, c.name, COUNT(*) AS cnt
     FROM exam_records r JOIN exam_categories c ON r.category_id = c.id
     ${where} GROUP BY c.id, c.name ORDER BY cnt DESC LIMIT 10`,
    params
  );

  const total = summary.total || 0;
  return {
    people: summary.people || 0,
    total,
    avgScore: total ? Math.round(summary.avgScore || 0) : 0,
    passCount: passCountRow[0].cnt,
    passRate: total ? Math.round(passCountRow[0].cnt / total * 100) : 0,
    distribution: byCategory,
  };
}

/** 格式化单条记录 */
function formatRow(r) {
  return {
    id: r.id, userId: r.user_id, categoryId: r.category_id, categoryName: r.categoryName || '',
    paperId: r.paper_id, paperTitle: r.paperTitle || '', userName: r.userName || '', departmentName: r.departmentName || '',
    mode: r.mode, score: r.score, totalScore: r.total_score, useTime: r.use_time,
    status: r.status, startTime: r.start_time, endTime: r.end_time, createdAt: r.created_at,
  };
}

/** CSV 字段转义(逗号/引号/换行) */
function csvField(v) {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

/**
 * 导出答题成绩 CSV(utf-8 BOM, Excel 可直接打开)
 * @param {Object} opts - { categoryId?, keyword? }
 * @returns {Promise<Object>} { filename, csv }
 */
async function exportRecords({ categoryId, keyword } = {}) {
  const conditions = ["r.mode IN ('exam','mock')"];
  const params = [];
  if (categoryId) { conditions.push('r.category_id = ?'); params.push(categoryId); }
  if (keyword) {
    conditions.push('(u.nickname LIKE ? OR u.user_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const where = 'WHERE ' + conditions.join(' AND ');

  const rows = await db.query(
    `SELECT r.*, c.name AS categoryName, u.nickname AS userName, d.name AS departmentName
     FROM exam_records r
     JOIN users u ON r.user_id = u.id
     LEFT JOIN exam_categories c ON r.category_id = c.id
     LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
     ${where} ORDER BY r.created_at DESC`,
    params
  );

  const modeMap = { practice: '练习', exam: '正式考试', mock: '模拟考试' };
  const statusMap = { doing: '进行中', submitted: '已提交', timeout: '已超时' };
  const headers = ['姓名', '部门', '分类', '模式', '分数', '总分', '用时(秒)', '状态', '交卷时间'];
  const lines = rows.map((r) => [
    csvField(r.userName), csvField(r.departmentName), csvField(r.categoryName),
    csvField(modeMap[r.mode] || r.mode),
    r.score != null ? r.score : '', r.total_score != null ? r.total_score : '',
    r.use_time != null ? r.use_time : '',
    csvField(statusMap[r.status] || r.status), r.end_time || '',
  ].join(','));
  const csv = '﻿' + [headers.join(','), ...lines].join('\n');
  return { filename: `answer-records-${new Date().toISOString().slice(0, 10)}.csv`, csv };
}

module.exports = { myRecords, allRecords, detail, overview, exportRecords };
