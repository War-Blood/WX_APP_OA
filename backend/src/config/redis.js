'use strict';

const redis = require('redis');
const config = require('./env');
const logger = require('../utils/logger');

/**
 * Redis 客户端实例
 */
let client = null;

/**
 * 初始化 Redis 连接
 * @returns {Promise<import('redis').RedisClientType>} Redis 客户端
 */
async function initRedis() {
  if (client && client.isOpen) {
    return client;
  }

  const url = config.redis.password
    ? `redis://:${config.redis.password}@${config.redis.host}:${config.redis.port}/${config.redis.db}`
    : `redis://${config.redis.host}:${config.redis.port}/${config.redis.db}`;

  client = redis.createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis 重连次数超过上限', { module: 'redis' });
          return new Error('Redis 重连失败');
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  client.on('connect', () => {
    logger.info('Redis 连接成功', {
      module: 'redis',
      host: config.redis.host,
      port: config.redis.port,
      db: config.redis.db,
    });
  });

  client.on('error', (err) => {
    logger.error('Redis 连接错误', { module: 'redis', error: err.message });
  });

  client.on('end', () => {
    logger.warn('Redis 连接关闭', { module: 'redis' });
  });

  await client.connect();
  return client;
}

/**
 * 获取 Redis 客户端
 * @returns {import('redis').RedisClientType}
 */
function getClient() {
  if (!client || !client.isOpen) {
    throw new Error('Redis 客户端未初始化，请先调用 initRedis()');
  }
  return client;
}

/**
 * 关闭 Redis 连接
 * @returns {Promise<void>}
 */
async function closeRedis() {
  if (client && client.isOpen) {
    await client.quit();
    logger.info('Redis 连接已关闭', { module: 'redis' });
  }
}

/**
 * 测试 Redis 连通性
 * @returns {Promise<boolean>}
 */
async function ping() {
  try {
    if (!client || !client.isOpen) return false;
    await client.ping();
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  initRedis,
  getClient,
  closeRedis,
  ping,
};
