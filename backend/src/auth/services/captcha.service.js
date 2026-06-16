'use strict';

const crypto = require('crypto');

// 内存存储（captchaId → { goalX, createdAt, verified }）
const captchaStore = new Map();
// verifyToken → captchaId（一次性消费）
const tokenStore = new Map();

const CAPTCHA_TTL = 5 * 60 * 1000;  // 5分钟

// 定时清理过期数据
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of captchaStore) {
    if (now - val.createdAt > CAPTCHA_TTL) captchaStore.delete(key);
  }
  for (const [key, val] of tokenStore) {
    if (now - val.createdAt > CAPTCHA_TTL) tokenStore.delete(key);
  }
}, 60000);

/**
 * 生成滑动验证
 * @returns {{ captchaId: string, goalX: number }} captchaId 和预期滑块位置百分比(0-100)
 */
function generateCaptcha() {
  const captchaId = crypto.randomUUID();
  // 目标位置: 滑块需要拖到 80%-95% 处
  const goalX = 80 + Math.floor(Math.random() * 15);
  captchaStore.set(captchaId, { goalX, createdAt: Date.now(), verified: false });
  return { captchaId, goalX };
}

/**
 * 验证滑块轨迹
 * @param {string} captchaId
 * @param {Array<{x:number, t:number}>} track — 轨迹点数组，每个点包含 x 位置(0-300)和时间戳
 * @returns {{ success: boolean, token?: string, error?: string }}
 */
function verifyCaptcha(captchaId, track) {
  const record = captchaStore.get(captchaId);
  if (!record) {
    return { success: false, error: '验证已过期，请重新滑动' };
  }
  if (record.verified) {
    return { success: false, error: '验证码已被使用' };
  }

  // 1. 检查轨迹数据有效性
  if (!Array.isArray(track) || track.length < 3) {
    return { success: false, error: '验证失败，请重试' };
  }

  // 2. 检查最终位置（前端已验证滑到底，后端仅检查非零）
  const lastPoint = track[track.length - 1];
  if (lastPoint.x <= 0) {
    return { success: false, error: '验证失败，请重试' };
  }

  // 3. 检测轨迹是否像人类行为
  const duration = track[track.length - 1].t - track[0].t;
  // 太快(<300ms)或太慢(>10s)判定为机器人
  if (duration < 300) {
    return { success: false, error: '验证失败，请重试' };
  }
  if (duration > 10000) {
    return { success: false, error: '验证超时，请重试' };
  }

  // 5. 检查轨迹是否有"回退"特征（人类拖滑块时会有微小回退）
  let hasBacktrack = false;
  for (let i = 1; i < track.length; i++) {
    if (track[i].x < track[i - 1].x - 2) {
      hasBacktrack = true;
      break;
    }
  }
  // 完全匀速直线判定为机器人（允许一点波动）
  if (!hasBacktrack && track.length < 5) {
    return { success: false, error: '验证失败，请重试' };
  }

  // 6. 验证通过：标记已验，生成一次性 token
  record.verified = true;
  const token = crypto.randomUUID();
  tokenStore.set(token, { captchaId, createdAt: Date.now() });

  return { success: true, token };
}

/**
 * 消费验证 token（登录时调用，一次性使用）
 * @param {string} token
 * @returns {boolean}
 */
function consumeToken(token) {
  if (!token) return false;
  const record = tokenStore.get(token);
  if (!record) return false;
  // 检查是否过期
  if (Date.now() - record.createdAt > CAPTCHA_TTL) {
    tokenStore.delete(token);
    return false;
  }
  tokenStore.delete(token);
  return true;
}

/**
 * 获取验证状态（供管理查询）
 */
function getStatus() {
  return {
    activeCaptchas: captchaStore.size,
    activeTokens: tokenStore.size,
  };
}

module.exports = { generateCaptcha, verifyCaptcha, consumeToken, getStatus };
