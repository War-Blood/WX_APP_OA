'use strict';

/**
 * Phase 2 定向验证测试脚本
 * 测试目标: http://111.229.107.123:3000/api
 * 测试账号: BL / BL123456
 */

const BASE = 'http://111.229.107.123:3000/api';
const ACCOUNT = 'BL';
const PASSWORD = 'BL123456';

// ============ 工具函数 ============
async function req(method, path, opts = {}) {
  const { body, token, raw } = opts;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const fetchOpts = { method, headers };
  if (body) fetchOpts.body = JSON.stringify(body);

  const start = Date.now();
  let res, data, err;
  try {
    res = await fetch(`${BASE}${path}`, fetchOpts);
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = text; }
  } catch (e) { err = e.message; }
  const elapsed = Date.now() - start;

  return {
    status: res?.status ?? 0,
    data,
    elapsed,
    error: err || null,
    ok: res?.ok ?? false,
  };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============ 滑动验证模拟 ============
async function getCaptcha() {
  console.log('[Captcha] 获取滑动验证...');
  const r = await req('GET', '/auth/captcha');
  console.log(`  Status: ${r.status}, data:`, JSON.stringify(r.data));
  return r.data?.data;
}

function simulateTrack(goalX) {
  // 模拟人类滑动轨迹：加速 → 匀速 → 减速 → 微小回退
  const track = [];
  const totalDuration = 600 + Math.floor(Math.random() * 400); // 600-1000ms
  const points = 10 + Math.floor(Math.random() * 5); // 10-14 个点
  
  for (let i = 0; i < points; i++) {
    const t = Math.floor((i / (points - 1)) * totalDuration);
    let progress = i / (points - 1);
    // 使用缓出曲线模拟人类滑动
    progress = 1 - Math.pow(1 - progress, 2);
    let x = Math.floor(progress * 280);
    // 加一点随机抖动
    x += Math.floor((Math.random() - 0.5) * 6);
    if (i > 0) x = Math.max(track[i-1].x - 2, x); // 允许微小回退
    
    track.push({ x: Math.max(1, x), t });
  }
  
  // 确保最后一个点在合理范围
  track[track.length - 1].x = Math.min(290, Math.max(250, track[track.length - 1].x));
  
  return track;
}

async function verifyCaptcha(captchaId, track) {
  console.log(`[Captcha] 验证滑动 (captchaId=${captchaId}, ${track.length} points)...`);
  const r = await req('POST', '/auth/captcha/verify', { body: { captchaId, track } });
  console.log(`  Status: ${r.status}, success: ${r.data?.data?.token ? 'YES' : 'NO'}`);
  return r.data?.data?.token;
}

async function loginWithCaptcha() {
  // Step 1: 获取 captcha
  const captcha = await getCaptcha();
  if (!captcha?.captchaId) {
    console.error('[Login] 获取验证码失败!');
    return null;
  }
  
  // Step 2: 模拟滑动验证
  const track = simulateTrack(captcha.goalX);
  const captchaToken = await verifyCaptcha(captcha.captchaId, track);
  if (!captchaToken) {
    console.error('[Login] 验证码校验失败!');
    return null;
  }
  
  // Step 3: 登录
  console.log('[Login] 管理员登录...');
  const r = await req('POST', '/auth/admin/login', {
    body: { account: ACCOUNT, password: PASSWORD, captchaToken }
  });
  console.log(`  Status: ${r.status}, elapsed: ${r.elapsed}ms`);
  console.log(`  Response:`, JSON.stringify(r.data).substring(0, 300));
  
  return r.data?.data?.token || null;
}

// 也尝试通过 accountLogin（小程序端，无需 captcha）登录
async function loginMiniProgram() {
  console.log('[Login-MP] 小程序账号密码登录...');
  const r = await req('POST', '/auth/account-login', {
    body: { account: ACCOUNT, password: PASSWORD }
  });
  console.log(`  Status: ${r.status}, elapsed: ${r.elapsed}ms`);
  console.log(`  Response:`, JSON.stringify(r.data).substring(0, 300));
  return r.data?.data?.token || null;
}

// ============ 测试 A: 日报列表性能 ============
async function testA_reportList(token) {
  console.log('\n========== 测试 A: 日报列表查询性能 ==========');
  const times = [];
  
  for (let i = 1; i <= 5; i++) {
    const r = await req('POST', '/report/list', {
      body: { status: 'all', page: 1, pageSize: 100 },
      token
    });
    times.push(r.elapsed);
    console.log(`  第${i}次: ${r.status} ${r.elapsed}ms | dataCount=${r.data?.data?.list?.length ?? 'N/A'}`);
  }
  
  times.sort((a,b) => a-b);
  const p50 = times[2];
  const p99 = times[4];
  console.log(`  P50: ${p50}ms, P99: ${p99}ms, Avg: ${(times.reduce((a,b)=>a+b,0)/5).toFixed(0)}ms`);
  return { p50, p99, times };
}

// ============ 测试 B: 认证中间件缓存 ============
async function testB_authCache(token) {
  console.log('\n========== 测试 B: 认证中间件 DB 查询验证 ==========');
  const results = [];
  
  for (let i = 1; i <= 10; i++) {
    const r = await req('POST', '/report/list', {
      body: { status: 'all', page: 1, pageSize: 20 },
      token
    });
    results.push({ seq: i, status: r.status, elapsed: r.elapsed, code: r.data?.code });
    console.log(`  第${i}次: ${r.status} ${r.elapsed}ms code=${r.data?.code}`);
    await sleep(50); // 50ms 间隔
  }
  
  const first = results[0].elapsed;
  const rest = results.slice(1).map(r => r.elapsed);
  const restAvg = (rest.reduce((a,b)=>a+b,0) / rest.length).toFixed(0);
  console.log(`  首次: ${first}ms, 后续平均: ${restAvg}ms, 差异: ${(first - restAvg).toFixed(0)}ms`);
  
  return { first, restAvg, results };
}

// ============ 测试 C: worker-stats 全表扫描 ============
async function testC_workerStats(token) {
  console.log('\n========== 测试 C: getWorkerStats 全表扫描验证 ==========');
  
  // 不带 keyword
  const r1 = await req('POST', '/report/worker-stats', { body: {}, token });
  console.log(`  无keyword: ${r1.status} ${r1.elapsed}ms`);
  console.log(`  响应:`, JSON.stringify(r1.data).substring(0, 400));
  
  await sleep(200);
  
  // 带 keyword
  const r2 = await req('POST', '/report/worker-stats', { body: { keyword: '李' }, token });
  console.log(`  keyword="李": ${r2.status} ${r2.elapsed}ms`);
  console.log(`  响应:`, JSON.stringify(r2.data).substring(0, 400));
  
  return { noKeyword: r1.elapsed, withKeyword: r2.elapsed };
}

// ============ 测试 D: 错误码验证 ============
async function testD_errorCodes() {
  console.log('\n========== 测试 D: HTTP 错误码验证 ==========');
  
  // D1: 无效 Token
  const r1 = await req('POST', '/report/list', {
    body: { status: 'all', page: 1, pageSize: 10 },
    token: 'invalidtoken123456'
  });
  console.log(`  [D1] 无效Token: HTTP ${r1.status}, code=${r1.data?.code}, msg="${r1.data?.message}"`);
  const d1Issue = r1.status === 200;
  
  // D2: 缺少必填参数
  const r2 = await req('POST', '/report/submit', { body: {} });
  console.log(`  [D2] 空body提交: HTTP ${r2.status}, code=${r2.data?.code}, msg="${r2.data?.message}"`);
  
  // D3: 无效路径
  const r3 = await req('GET', '/nonexistent');
  console.log(`  [D3] 无效路径: HTTP ${r3.status}, code=${r3.data?.code}, msg="${r3.data?.message}"`);
  
  // D4: 无 Token 访问受保护资源
  const r4 = await req('POST', '/report/list', { body: { status: 'all' } });
  console.log(`  [D4] 无Token: HTTP ${r4.status}, code=${r4.data?.code}, msg="${r4.data?.message}"`);
  
  return { d1Issue, d1: r1, d2: r2, d3: r3, d4: r4 };
}

// ============ 测试 E: daily-status ============
async function testE_dailyStatus(token) {
  console.log('\n========== 测试 E: getDailyStatus 多次查询验证 ==========');
  
  const r = await req('POST', '/report/daily-status', { body: {}, token });
  console.log(`  Status: ${r.status}, elapsed: ${r.elapsed}ms`);
  console.log(`  响应:`, JSON.stringify(r.data).substring(0, 500));
  
  return r;
}

// ============ 测试 F: 并发测试 ============
async function testF_concurrency(token) {
  console.log('\n========== 测试 F: 并发处理能力验证 (10并发) ==========');
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(req('POST', '/report/list', {
      body: { status: 'all', page: 1, pageSize: 20 },
      token
    }));
  }
  
  const results = await Promise.all(promises);
  const times = results.map(r => r.elapsed);
  const successCount = results.filter(r => r.status === 200).length;
  
  times.sort((a,b) => a-b);
  console.log(`  成功: ${successCount}/${results.length}`);
  console.log(`  响应时间(min/max/avg): ${times[0]}/${times[times.length-1]}/${(times.reduce((a,b)=>a+b,0)/times.length).toFixed(0)}ms`);
  console.log(`  各次响应时间: [${times.join(', ')}]ms`);
  
  return { successCount, total: 10, times };
}

// ============ 主流程 ============
async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   Phase 2 API 定向验证测试            ║');
  console.log('╚═══════════════════════════════════════╝');
  console.log(`目标: ${BASE}`);
  console.log(`时间: ${new Date().toISOString()}`);
  
  // ---- 登录 ----
  console.log('\n========== 0. 身份认证 ==========');
  
  // 先尝试小程序登录（无需captcha）
  let token = await loginMiniProgram();
  
  if (!token) {
    // 回退到 admin login（需要 captcha）
    token = await loginWithCaptcha();
  }
  
  if (!token) {
    console.error('\n❌ 无法获取 Token，终止测试！');
    // 继续进行不需要 token 的测试
  } else {
    console.log(`\n✅ Token 获取成功: ${token.substring(0, 20)}...`);
  }
  
  const report = { timestamp: new Date().toISOString(), base: BASE, tests: {} };
  
  // ---- 执行测试 ----
  if (token) {
    report.tests.A = await testA_reportList(token);
    report.tests.B = await testB_authCache(token);
    report.tests.C = await testC_workerStats(token);
    report.tests.E = await testE_dailyStatus(token);
    report.tests.F = await testF_concurrency(token);
  } else {
    console.log('\n⚠️  测试 A/B/C/E/F 因无 Token 跳过');
  }
  
  report.tests.D = await testD_errorCodes();
  
  // ---- 汇总 ----
  console.log('\n\n========== 测试汇总 ==========');
  console.log(JSON.stringify(report, null, 2));
  
  return report;
}

main().catch(console.error);
