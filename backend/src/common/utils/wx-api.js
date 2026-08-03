'use strict';

const axios = require('axios');
const config = require('../config/env');
const { BusinessError } = require('./errors');
const logger = require('./logger');

/**
 * 微信 API 工具
 * 封装小程序登录凭证换取 openid 等公共微信接口调用
 */

/**
 * 用微信登录凭证 code 换取 openid
 * @param {string} code - 微信小程序 uni.login 获取的登录凭证
 * @returns {Promise<string>} 真实微信 openid
 * @throws {BusinessError} 微信接口调用失败时
 */
async function code2session(code) {
  if (!code) {
    throw new BusinessError('微信登录凭证 code 不能为空');
  }

  const wxResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
    params: {
      appid: config.wx.appId,
      secret: config.wx.secret,
      js_code: code,
      grant_type: 'authorization_code',
    },
    timeout: 5000,
  });

  const { openid, errcode, errmsg } = wxResponse.data;

  if (!openid) {
    logger.error('微信 code2session 失败', { module: 'WX-API', errcode, errmsg });
    throw new BusinessError('微信登录失败: ' + (errmsg || '获取 openid 失败'));
  }

  return openid;
}

module.exports = { code2session };
