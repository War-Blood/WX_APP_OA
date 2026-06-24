'use strict';

const axios = require('axios');
const config = require('../../common/config/env');

// 获取access_token(带缓存)
let accessTokenCache = { token: null, expiresAt: 0 };

/**
 * 获取微信 access_token（带缓存机制）
 * @returns {Promise<string>} access_token
 */
async function getAccessToken() {
  if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.wx.appId}&secret=${config.wx.secret}`;
  const res = await axios.get(url);

  if (res.data.access_token) {
    accessTokenCache = {
      token: res.data.access_token,
      expiresAt: Date.now() + (res.data.expires_in - 300) * 1000 // 提前5分钟过期
    };
    return res.data.access_token;
  }

  throw new Error('获取access_token失败');
}

/**
 * 发送微信模板消息
 * @param {number} userId - 用户ID
 * @param {Object} templateData - 模板数据
 * @returns {Promise<boolean>} 是否发送成功
 */
async function sendWechatTemplate(userId, templateData) {
  try {
    // 1. 查询用户的openid
    const db = require('../../common/config/database');
    const rows = await db.query('SELECT openid FROM users WHERE id = ?', [userId]);

    if (!rows || rows.length === 0 || !rows[0].openid) {
      console.warn(`用户${userId}没有绑定openid,无法发送微信消息`);
      return false;
    }

    const openid = rows[0].openid;
    const accessToken = await getAccessToken();

    // 2. 调用微信API
    const url = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;
    const payload = {
      touser: openid,
      template_id: process.env.WECHAT_TEMPLATE_ID_REMINDER || 'your_template_id',
      data: templateData
    };

    const res = await axios.post(url, payload);

    if (res.data.errcode === 0) {
      console.log(`微信模板消息发送成功: userId=${userId}, msgid=${res.data.msgid}`);
      return true;
    } else {
      console.error(`微信模板消息发送失败:`, res.data);
      return false;
    }
  } catch (err) {
    console.error('sendWechatTemplate错误:', err.message);
    return false;
  }
}

module.exports = { sendWechatTemplate, getAccessToken };
