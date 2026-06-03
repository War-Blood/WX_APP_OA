'use strict';

const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('../utils/logger');

/**
 * OA 数据库连接池（wx_app_oa）
 * 新业务主库
 */
const oaPool = mysql.createPool({
  host: config.oaDb.host,
  port: config.oaDb.port,
  user: config.oaDb.user,
  password: config.oaDb.password,
  database: config.oaDb.name,
  waitForConnections: true,
  connectionLimit: config.oaDb.poolMax,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: 'utf8mb4',
  timezone: '+08:00',
});

/**
 * 旧版数据库连接池（daily_report）
 * 用于数据迁移和旧系统兼容
 */
const oldPool = mysql.createPool({
  host: config.oldDb.host,
  port: config.oldDb.port,
  user: config.oldDb.user,
  password: config.oldDb.password,
  database: config.oldDb.name,
  waitForConnections: true,
  connectionLimit: config.oldDb.poolMax,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  charset: 'utf8mb4',
  timezone: '+08:00',
});

/**
 * 获取 OA 库连接
 */
async function getConnection() {
  return oaPool.getConnection();
}

/**
 * 获取旧版库连接
 */
async function getOldConnection() {
  return oldPool.getConnection();
}

/**
 * 在 OA 库上执行参数化查询
 * @param {string} sql - SQL 语句（使用 ? 占位符）
 * @param {Array} [params=[]] - 参数数组
 * @returns {Promise<Array>} 查询结果
 */
async function query(sql, params = []) {
  const start = Date.now();
  try {
    const [rows] = await oaPool.query(sql, params);
    logger.debug('DB 查询成功', {
      module: 'database',
      sql: sql.substring(0, 200),
      duration: `${Date.now() - start}ms`,
    });
    return rows;
  } catch (err) {
    logger.error('DB 查询失败', {
      module: 'database',
      sql: sql.substring(0, 200),
      error: err.message,
    });
    throw err;
  }
}

/**
 * 在 OA 库上执行参数化 execute（用于 INSERT/UPDATE/DELETE）
 * @param {string} sql - SQL 语句
 * @param {Array} [params=[]] - 参数数组
 * @returns {Promise<[ResultSetHeader, undefined]>} 执行结果
 */
async function execute(sql, params = []) {
  const start = Date.now();
  try {
    const result = await oaPool.execute(sql, params);
    logger.debug('DB 执行成功', {
      module: 'database',
      sql: sql.substring(0, 200),
      duration: `${Date.now() - start}ms`,
    });
    return result;
  } catch (err) {
    logger.error('DB 执行失败', {
      module: 'database',
      sql: sql.substring(0, 200),
      error: err.message,
    });
    throw err;
  }
}

/**
 * 在旧版库上执行查询
 * @param {string} sql - SQL 语句
 * @param {Array} [params=[]] - 参数数组
 * @returns {Promise<Array>} 查询结果
 */
async function oldQuery(sql, params = []) {
  const start = Date.now();
  try {
    const [rows] = await oldPool.query(sql, params);
    logger.debug('旧版DB查询成功', {
      module: 'database',
      sql: sql.substring(0, 200),
      duration: `${Date.now() - start}ms`,
    });
    return rows;
  } catch (err) {
    logger.error('旧版DB查询失败', {
      module: 'database',
      sql: sql.substring(0, 200),
      error: err.message,
    });
    throw err;
  }
}

/**
 * 在旧版库上执行 execute
 * @param {string} sql - SQL 语句
 * @param {Array} [params=[]] - 参数数组
 * @returns {Promise<[ResultSetHeader, undefined]>} 执行结果
 */
async function oldExecute(sql, params = []) {
  const start = Date.now();
  try {
    const result = await oldPool.execute(sql, params);
    logger.debug('旧版DB执行成功', {
      module: 'database',
      sql: sql.substring(0, 200),
      duration: `${Date.now() - start}ms`,
    });
    return result;
  } catch (err) {
    logger.error('旧版DB执行失败', {
      module: 'database',
      sql: sql.substring(0, 200),
      error: err.message,
    });
    throw err;
  }
}

/**
 * 事务执行
 * @param {Function} callback - 事务回调，接收 connection 参数
 * @returns {Promise<*>} 事务回调的返回值
 */
async function transaction(callback) {
  const conn = await oaPool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * 测试 OA 库连通性
 * @returns {Promise<boolean>}
 */
async function ping() {
  try {
    await oaPool.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * 测试旧版库连通性
 * @returns {Promise<boolean>}
 */
async function oldPing() {
  try {
    await oldPool.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  getConnection,
  getOldConnection,
  query,
  execute,
  oldQuery,
  oldExecute,
  transaction,
  ping,
  oldPing,
  oaPool,
  oldPool,
};
