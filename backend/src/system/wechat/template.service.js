'use strict';

const axios = require('axios');
const config = require('../../common/config/env');
const db = require('../../common/config/database');

// 获取access_token(带缓存)
let accessTokenCache = { token: null, expiresAt: 0 };

async function getAccessToken() {
  if (accessTokenCache.token && Date.now() < accessTokenCache.expiresAt) {
    return accessTokenCache.token;
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.wx.appId}&secret=${config.wx.secret}`;
  const res = await axios.get(url);
  if (res.data.access_token) {
    accessTokenCache = {
      token: res.data.access_token,
      expiresAt: Date.now() + (res.data.expires_in - 300) * 1000
    };
    return res.data.access_token;
  }
  throw new Error('获取access_token失败');
}

/**
 * 记录/更新用户订阅授权
 */
async function recordSubscription(userId, templateId) {
  await db.execute(
    `INSERT INTO user_subscriptions (user_id, template_id, status, subscribed_at, updated_at)
     VALUES (?, ?, 'active', NOW(), NOW())
     ON DUPLICATE KEY UPDATE status = 'active', updated_at = NOW()`,
    [userId, templateId || config.wx.subscribeTemplateId]
  );
}

/**
 * 检查用户是否有有效订阅
 */
async function hasSubscription(userId) {
  const rows = await db.query(
    'SELECT id FROM user_subscriptions WHERE user_id = ? AND template_id = ? AND status = "active"',
    [userId, config.wx.subscribeTemplateId]
  );
  return rows.length > 0;
}

/**
 * 发送微信订阅消息
 * 模板关键词：时间(time1)、温馨提示(thing2)、填写状态(phrase3)
 */
async function sendSubscribeMessage(userId, { time, tip, status }) {
  try {
    // 1. 查 openid + 验证订阅授权
    const rows = await db.query(
      `SELECT u.openid FROM users u
       INNER JOIN user_subscriptions us ON u.id = us.user_id
       WHERE u.id = ? AND us.template_id = ? AND us.status = 'active'`,
      [userId, config.wx.subscribeTemplateId]
    );

    if (!rows.length || !rows[0].openid) {
      return { success: false, reason: 'no_openid_or_subscription' };
    }

    const accessToken = await getAccessToken();

    // 2. 调用订阅消息发送接口
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`;
    const payload = {
      touser: rows[0].openid,
      template_id: config.wx.subscribeTemplateId,
      page: 'pages/home/index',
      data: {
        time1: { value: time },
        thing2: { value: tip },
        phrase3: { value: status }
      },
      miniprogram_state: process.env.NODE_ENV === 'production' ? 'formal' : 'developer'
    };

    const res = await axios.post(url, payload);

    if (res.data.errcode === 0) {
      return { success: true };
    }

    // 授权已用完或取消 → 标记失效
    if (res.data.errcode === 43101) {
      await db.execute(
        'UPDATE user_subscriptions SET status = "cancelled", updated_at = NOW() WHERE user_id = ? AND template_id = ?',
        [userId, config.wx.subscribeTemplateId]
      );
      return { success: false, reason: 'expired' };
    }

    return { success: false, reason: `errcode=${res.data.errcode} ${res.data.errmsg}` };

  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// 保留旧接口兼容
async function sendWechatTemplate(userId, templateData) {
  return sendSubscribeMessage(userId, {
    time: templateData.report_date?.value || '',
    tip: templateData.first?.value || templateData.remark?.value || '',
    status: '未提交'
  });
}

module.exports = {
  getAccessToken,
  sendWechatTemplate,
  sendSubscribeMessage,
  recordSubscription,
  hasSubscription
};
