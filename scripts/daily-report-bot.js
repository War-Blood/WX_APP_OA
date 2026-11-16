#!/usr/bin/env node
'use strict';

/**
 * @file 日报机器人 — 自动生成并提交「工作日报（office）」到智慧办公助手 OA。
 *
 * 设计约束（不动小程序、不动后端）：
 * - 只调用已上线接口：/api/auth/account-login → /api/report/today-status → /api/report/submit
 * - 内容来源：需求/任务日志/YYYY-MM-DD.md（daily-work-log 技能产出），缺失时回退 git 提交记录
 * - 幂等：当日已提交则跳过；当日是草稿则覆盖为已提交
 *
 * 用法：
 *   node scripts/daily-report-bot.js                       # 预览当天内容（不联网）
 *   node scripts/daily-report-bot.js --date 2026-11-17     # 预览指定日期
 *   OA_ACCOUNT=工号 OA_PASSWORD=密码 node scripts/daily-report-bot.js --submit
 *
 * 退出码：0 成功/跳过/预览成功，1 出错
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const TASK_LOG_DIR = path.join(REPO_ROOT, '需求', '任务日志');
const DEFAULT_BASE = 'https://warblood.online';
const DEFAULT_LIMIT = 12;

/** 各字段长度上限，与小程序工作日报表单 maxlength 对齐 */
const FIELD_LIMITS = {
  todayWork: 2000,
  tomorrowPlan: 1000,
  issues: 500,
  coordination: 500,
};

/** 任务日志小节标题 → 日报字段 */
const SECTION_ALIASES = [
  { key: 'todayWork', titles: ['今日工作内容', '今日工作'] },
  { key: 'tomorrowPlan', titles: ['明日工作计划', '明日计划'] },
  { key: 'issues', titles: ['遇到的问题', '存在问题', '问题'] },
  { key: 'coordination', titles: ['需协调事项', '协调事项', '需协调'] },
];

/** 小节标题命中即停止解析（提报公司日报时要删掉的开发者内容） */
const STOP_SECTION_PREFIXES = ['开发补充', '完成明细', '部署状态', '验证结果'];

/**
 * 打印错误并以退出码 1 结束
 * @param {string} message - 错误描述
 * @returns {void}
 */
function die(message) {
  console.error('[daily-report-bot] ' + message);
  process.exit(1);
}

/**
 * 解析命令行参数
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Object} 参数对象
 */
function parseArgs(argv) {
  const opts = {
    date: '',
    source: 'auto',
    submit: false,
    account: '',
    password: '',
    base: '',
    limit: DEFAULT_LIMIT,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => {
      const v = argv[++i];
      if (v === undefined) die('参数缺少取值: ' + arg);
      return v;
    };

    if (arg === '--date' || arg === '-d') opts.date = value();
    else if (arg === '--source') opts.source = value();
    else if (arg === '--account') opts.account = value();
    else if (arg === '--password') opts.password = value();
    else if (arg === '--base') opts.base = value();
    else if (arg === '--limit') opts.limit = Number(value());
    else if (arg === '--submit' || arg === '--yes') opts.submit = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else die('未知参数: ' + arg + '（--help 查看用法）');
  }

  return opts;
}

/**
 * 输出帮助信息
 * @returns {void}
 */
function usage() {
  console.log([
    '日报机器人 — 生成并提交工作日报到 OA',
    '',
    '用法: node scripts/daily-report-bot.js [选项]',
    '',
    '选项:',
    '  -d, --date <YYYY-MM-DD>  日报日期，缺省为今天（Asia/Shanghai）',
    '      --source <auto|log|git>',
    '                           内容来源，auto=优先任务日志、缺失回退 git（默认）',
    '      --limit <n>          git 回退时最多取几条提交记录（默认 12）',
    '      --submit             真正提交；不传则只预览',
    '      --account <账号>      登录账号，缺省读环境变量 OA_ACCOUNT',
    '      --password <密码>     登录密码，缺省读环境变量 OA_PASSWORD（推荐用环境变量）',
    '      --base <url>          API 根地址，缺省环境变量 OA_API_BASE 或 ' + DEFAULT_BASE,
    '  -h, --help               显示本帮助',
    '',
    '示例:',
    '  node scripts/daily-report-bot.js --date 2026-11-17',
    '  OA_ACCOUNT=zhangsan OA_PASSWORD=*** node scripts/daily-report-bot.js --submit',
  ].join('\n'));
}

/**
 * 返回上海时区的当天日期
 * @returns {string} YYYY-MM-DD
 */
function todayInShanghai() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * 日期加减天数
 * @param {string} date - YYYY-MM-DD
 * @param {number} days - 偏移天数
 * @returns {string} YYYY-MM-DD
 */
function addDays(date, days) {
  const [y, m, d] = date.split('-').map(Number);
  const ts = Date.UTC(y, m - 1, d) + days * 86400000;
  return new Date(ts).toISOString().slice(0, 10);
}

/**
 * 校验日期字符串
 * @param {string} date - 待校验日期
 * @returns {boolean} 是否合法
 */
function isValidDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * 按标题查日报字段 key
 * @param {string} title - 小节标题
 * @returns {string|null} 字段 key
 */
function resolveSection(title) {
  const hit = SECTION_ALIASES.find(item => item.titles.some(t => title === t || title.startsWith(t)));
  return hit ? hit.key : null;
}

/**
 * 去掉列表符号与复选框标记
 * @param {string} line - 原始行
 * @returns {string} 清洗后的文本
 */
function cleanBullet(line) {
  return line
    .replace(/^[-*+]\s+\[[ xX]\]\s*/, '')
    .replace(/^[-*+]\s+/, '')
    .replace(/^\d+[.、)]\s*/, '')
    .trim();
}

/**
 * 解析任务日志 Markdown 的四段内容
 * @param {string} text - 文件全文
 * @returns {{todayWork: string[], tomorrowPlan: string[], issues: string[], coordination: string[]}}
 */
function parseTaskLog(text) {
  const buckets = { todayWork: [], tomorrowPlan: [], issues: [], coordination: [] };
  let current = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^#{2,3}\s+(.+?)\s*$/.exec(line);

    if (heading) {
      const title = heading[1].trim();
      if (STOP_SECTION_PREFIXES.some(p => title.startsWith(p))) break;
      current = resolveSection(title);
      continue;
    }

    if (!line || /^-{3,}$/.test(line) || !current) continue;
    const item = cleanBullet(line);
    if (item) buckets[current].push(item);
  }

  return buckets;
}

/**
 * 从 git 提交记录生成当日工作条目
 * @param {string} date - YYYY-MM-DD
 * @param {number} limit - 最多条数
 * @returns {string[]} 提交主题列表
 */
function collectFromGit(date, limit) {
  const args = [
    'log',
    '--since=' + date + ' 00:00:00',
    '--until=' + addDays(date, 1) + ' 00:00:00',
    '--no-merges',
    '--pretty=format:%s',
  ];

  let output = '';
  try {
    output = execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (err) {
    return [];
  }

  const subjects = output
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^[a-zA-Z]+(\([^)]*\))?!?:\s*/, '').trim())
    .filter(Boolean);

  return [...new Set(subjects)].slice(0, limit);
}

/**
 * 截断超长文本
 * @param {string} text - 原文
 * @param {number} max - 上限
 * @returns {string} 截断后的文本
 */
function clamp(text, max) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + '…';
}

/**
 * 组装日报正文
 * @param {Object} opts - 命令行参数
 * @returns {{payload: Object, source: string, warnings: string[]}}
 */
function buildPayload(opts) {
  const warnings = [];
  const logPath = path.join(TASK_LOG_DIR, opts.date + '.md');
  let parsed = null;

  if (opts.source !== 'git' && fs.existsSync(logPath)) {
    parsed = parseTaskLog(fs.readFileSync(logPath, 'utf8'));
  }
  if (opts.source === 'log' && !parsed) {
    die('未找到任务日志: ' + path.relative(REPO_ROOT, logPath));
  }

  let source = 'git';
  let todayItems = [];

  if (parsed && parsed.todayWork.length > 0) {
    source = '任务日志';
    todayItems = parsed.todayWork;
  } else {
    todayItems = collectFromGit(opts.date, opts.limit);
    if (parsed) warnings.push('任务日志缺少「今日工作内容」，已回退 git 提交记录');
  }

  if (todayItems.length === 0) {
    die('当日没有可用的工作内容（既无任务日志，也无 git 提交），请先补写 需求/任务日志/' + opts.date + '.md');
  }

  const join = items => items.map(i => '- ' + i).join('\n');
  const tomorrow = parsed ? parsed.tomorrowPlan : [];
  if (tomorrow.length === 0) warnings.push('明日计划为空，请确认是否符合预期');

  const payload = {
    reportType: 'office',
    reportDate: opts.date,
    todayWork: clamp(join(todayItems), FIELD_LIMITS.todayWork),
    tomorrowPlan: clamp(join(tomorrow), FIELD_LIMITS.tomorrowPlan),
    issues: clamp(join(parsed ? parsed.issues : []), FIELD_LIMITS.issues),
    coordination: clamp(join(parsed ? parsed.coordination : []), FIELD_LIMITS.coordination),
  };

  return { payload, source, warnings };
}

/**
 * 调用 OA 接口
 * @param {string} base - API 根地址
 * @param {string} route - 路由
 * @param {Object} body - 请求体
 * @param {string} [token] - Bearer Token
 * @returns {Promise<Object>} 接口响应 JSON
 */
async function callApi(base, route, body, token) {
  const url = base.replace(/\/+$/, '') + route;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;

  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch (err) {
    die('网络请求失败(' + route + '): ' + err.message);
  }

  try {
    return await res.json();
  } catch (err) {
    die('接口返回非 JSON(' + route + ', HTTP ' + res.status + ')');
  }
}

/**
 * 打印日报预览
 * @param {Object} payload - 待提交内容
 * @param {string} source - 内容来源
 * @returns {void}
 */
function printPreview(payload, source) {
  const fields = [
    ['今日工作内容', payload.todayWork, FIELD_LIMITS.todayWork],
    ['明日计划', payload.tomorrowPlan, FIELD_LIMITS.tomorrowPlan],
    ['遇到的问题', payload.issues, FIELD_LIMITS.issues],
    ['需协调事项', payload.coordination, FIELD_LIMITS.coordination],
  ];

  console.log('');
  console.log('日期: ' + payload.reportDate + '    类型: 工作日报(office)    内容来源: ' + source);
  for (const [label, text, limit] of fields) {
    console.log('');
    console.log('【' + label + '】(' + text.length + '/' + limit + ')');
    console.log(text || '(空)');
  }
  console.log('');
}

async function main() {
  if (typeof fetch !== 'function') {
    die('需要 Node.js 18 及以上版本（依赖全局 fetch）');
  }

  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }

  opts.date = opts.date || todayInShanghai();
  if (!isValidDate(opts.date)) die('日期格式错误，应为 YYYY-MM-DD: ' + opts.date);
  if (opts.date > todayInShanghai()) die('不能为未来日期提交日报: ' + opts.date);

  const { payload, source, warnings } = buildPayload(opts);
  printPreview(payload, source);
  for (const w of warnings) console.log('⚠️  ' + w);

  if (!opts.submit) {
    console.log('ℹ️  预览模式，未提交。确认无误后加 --submit 提交。');
    return;
  }

  const account = opts.account || process.env.OA_ACCOUNT || '';
  const password = opts.password || process.env.OA_PASSWORD || '';
  const base = opts.base || process.env.OA_API_BASE || DEFAULT_BASE;

  if (!account || !password) {
    die('缺少登录凭证：请设置环境变量 OA_ACCOUNT / OA_PASSWORD，或传 --account/--password');
  }
  if (opts.password) {
    console.log('⚠️  密码通过命令行传入会留在 shell 历史中，建议改用环境变量 OA_PASSWORD');
  }

  const login = await callApi(base, '/api/auth/account-login', { account, password });
  if (login.code !== 0 || !login.data || !login.data.token) {
    die('登录失败: ' + (login.message || '未知错误'));
  }
  const token = login.data.token;
  console.log('✅ 登录成功: ' + ((login.data.user && login.data.user.nickname) || account));

  const status = await callApi(base, '/api/report/today-status', { reportDate: opts.date }, token);
  const current = (status.data && status.data.status) || 'none';

  if (current === 'submitted') {
    console.log('ℹ️  ' + opts.date + ' 工作日报已提交（reportId=' + status.data.reportId + '），本次跳过。');
    return;
  }
  if (current === 'draft') {
    console.log('ℹ️  检测到当日草稿，将以本次内容覆盖提交。');
  }

  const result = await callApi(base, '/api/report/submit', payload, token);
  if (result.code !== 0) {
    die('提交失败: ' + (result.message || '未知错误') + (result.code ? '（code=' + result.code + '）' : ''));
  }

  console.log('✅ 已提交 ' + opts.date + ' 工作日报，reportId=' + (result.data && result.data.reportId));
}

main().catch(err => die(err && err.message ? err.message : String(err)));
