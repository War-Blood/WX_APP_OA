'use strict';

const crypto = require('crypto');
const axios = require('axios');
const logger = require('../../../common/utils/logger');
const { BusinessError } = require('../../../common/utils/errors');
const { ErrorCode } = require('../../../common/utils/constants');

/**
 * 企微群机器人发送器（核心安全件）
 * - 凭证仅从服务端 env 读取（对齐 WPS），任何日志/异常不得输出完整 key/secret
 * - 强制加签：sign = base64(HMAC-SHA256(secret, timestamp + "\n" + secret))
 * - 出站 URL 固定拼接企微域名，不接受自定义 URL
 */

const WEBHOOK_BASE = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send';
const CREDENTIAL_RE = /^[A-Za-z0-9\-_]{8,}$/;

/**
 * 读取机器人凭证（界面直输模式：push_webhooks.webhook_key 存库，secret 可选加签）
 * @param {Object} webhook - push_webhooks 行（含 webhook_key / secret）
 * @returns {{key: string, secret: string}|null} 凭证；key 缺失返回 null
 */
function getCredential(webhook) {
  if (!webhook || !webhook.webhook_key) return null;
  return { key: webhook.webhook_key, secret: webhook.secret || '' };
}

/**
 * 判断机器人是否已配置凭证（key 存在即可用；secret 可选）
 * @param {Object} webhook - push_webhooks 行
 * @returns {boolean}
 */
function isConfigured(webhook) {
  return getCredential(webhook) !== null;
}

/**
 * 计算加签
 * @param {string} secret - 加签密钥
 * @param {number} timestamp - 秒级时间戳
 * @returns {string} base64(HMAC-SHA256)
 */
function computeSign(secret, timestamp) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}\n${secret}`)
    .digest('base64');
}

/**
 * 脱敏 URL（日志/错误信息使用，key 替换为 ***）
 * @param {string} url - 完整 webhook URL
 * @returns {string}
 */
function maskUrl(url) {
  if (!url) return '';
  return url.replace(/([?&]key=)[^&]+/, '$1***');
}

/**
 * 校验凭证格式（防注入）；secret 可选，填了必须合法
 * @param {string} key - webhook key
 * @param {string} [secret] - 加签密钥（可选）
 * @throws {BusinessError} 格式非法时
 */
function assertCredentialFormat(key, secret) {
  if (!CREDENTIAL_RE.test(key)) {
    throw new BusinessError('机器人凭证格式非法，请检查配置', null, ErrorCode.PUSH_WEBHOOK_NOT_CONFIGURED);
  }
  if (secret && !CREDENTIAL_RE.test(secret)) {
    throw new BusinessError('加签密钥格式非法（至少 8 位字母/数字/下划线/连字符）', null, ErrorCode.PUSH_WEBHOOK_NOT_CONFIGURED);
  }
}

/**
 * 构建请求体
 * @param {string} msgtype - 'text' | 'markdown'
 * @param {string} content - 渲染后内容
 * @param {Object} mentions - {mobileList: string[], useridList: string[]}
 * @returns {Object}
 */
function buildBody(msgtype, content, mentions) {
  const mobileList = (mentions && mentions.mobileList) || [];
  const useridList = (mentions && mentions.useridList) || [];
  if (msgtype === 'markdown') {
    // markdown @ 仅支持 <@userid> 语法，追加到内容末尾
    const mentionText = useridList.map((u) => `<@${u}>`).join(' ');
    return {
      msgtype: 'markdown',
      markdown: { content: mentionText ? `${content}\n${mentionText}` : content },
    };
  }
  return {
    msgtype: 'text',
    text: {
      content,
      mentioned_list: [],
      mentioned_mobile_list: mobileList,
    },
  };
}

/**
 * 单次发送
 * @param {Object} webhook - push_webhooks 行
 * @param {string} msgtype - 'text' | 'markdown'
 * @param {string} content - 渲染后内容
 * @param {Object} mentions - {mobileList, useridList}
 * @returns {Promise<{httpStatus: number, errcode: number, errmsg: string, msgid: string, durationMs: number}>}
 */
async function sendOnce(webhook, msgtype, content, mentions) {
  const credential = getCredential(webhook);
  if (!credential) {
    throw new BusinessError(`群机器人「${webhook.name || ''}」未配置凭证`, null, ErrorCode.PUSH_WEBHOOK_NOT_CONFIGURED);
  }
  assertCredentialFormat(credential.key, credential.secret);

  let url = `${WEBHOOK_BASE}?key=${encodeURIComponent(credential.key)}`;
  // 加签：secret 配置了才带 sign（未配置时企微忽略，兼容未开启加签的机器人）
  if (credential.secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = computeSign(credential.secret, timestamp);
    url += `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
  }
  const body = buildBody(msgtype, content, mentions);

  const start = Date.now();
  const res = await axios.post(url, body, { timeout: 30000 });
  const data = res.data || {};
  return {
    httpStatus: res.status,
    errcode: data.errcode,
    errmsg: data.errmsg || '',
    msgid: data.msgid || '',
    durationMs: Date.now() - start,
  };
}

/**
 * 带指数退避重试的发送
 * @param {Object} webhook - {envName, name}
 * @param {string} msgtype - 消息类型
 * @param {string} content - 渲染后内容
 * @param {Object} mentions - {mobileList, useridList}
 * @param {Object} opts - {retryTimes, retryInterval}
 * @returns {Promise<{success: boolean, attempts: Array}>}
 */
async function sendWithRetry(webhook, msgtype, content, mentions, opts) {
  const retryTimes = Math.min(Number(opts.retryTimes) || 0, 5);
  const retryInterval = Math.min(Math.max(Number(opts.retryInterval) || 60, 10), 3600);
  const attempts = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let attempt = 1; attempt <= retryTimes + 1; attempt++) {
    const record = { attempt };
    try {
      const result = await sendOnce(webhook, msgtype, content, mentions);
      record.httpStatus = result.httpStatus;
      record.errcode = result.errcode;
      record.errmsg = result.errmsg;
      record.msgid = result.msgid;
      record.durationMs = result.durationMs;
      attempts.push(record);
      if (result.errcode === 0) {
        return { success: true, attempts };
      }
      if (result.errcode === 93000) {
        // 加签非法：重试无意义，立即失败
        record.error = `加签校验失败(93000): ${result.errmsg}`;
        logger.error('[PushSender] 加签校验失败，可能密钥错误或时间偏差', {
          module: 'PUSH',
          webhook: webhook.name,
          url: maskUrl(WEBHOOK_BASE),
        });
        return { success: false, attempts };
      }
    } catch (err) {
      const errMsg = err.response?.data?.errmsg || err.message;
      record.error = errMsg;
      record.httpStatus = err.response?.status;
      attempts.push(record);
      logger.warn('[PushSender] 发送失败', {
        module: 'PUSH',
        webhook: webhook.name,
        attempt,
        error: errMsg,
        url: maskUrl(WEBHOOK_BASE),
      });
    }
    if (attempt <= retryTimes) {
      await sleep(retryInterval * Math.pow(2, attempt - 1));
    }
  }
  return { success: false, attempts };
}

module.exports = { sendWithRetry, getCredential, isConfigured, computeSign, maskUrl, buildBody, WEBHOOK_BASE };
