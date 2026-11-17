#!/usr/bin/env node
'use strict';

/**
 * @file 日报自动生成 — 汇总当日 .workbuddy 日志与 DSH 会话，生成 ≤100 字工作内容 + ≤20 字明日计划，
 *       写入缓存 JSON 后调用 daily-report-inject.js 落库。
 *
 * 用法：
 *   node scripts/daily-report-auto.js --ssh srv                 # 只生成并预览
 *   node scripts/daily-report-auto.js --ssh srv --apply         # 生成并上传
 *   node scripts/daily-report-auto.js --ssh srv --date 2026-11-16 --apply
 *
 * 说明：日报正文里会自动剔除「日报自动化」本身相关的条目。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(__dirname, '.daily-report-cache');
const SESSIONS_ROOT = path.join(os.homedir(), '.dsh', 'sessions');

/** 每日正文上限 */
const MAX_TODAY = 100;
/** 明日计划上限 */
const MAX_PLAN = 20;
/** 不写进日报的内容（自动化本身） */
const EXCLUDE = /帮我写|写日$|日报注入|注入日报|日报补全|补全.{0,6}日报|日报工具|日报上传|日报生成|日报记录|日报页面|写日报|自动日报|日报机器人|日报自动|导入到对应账号|注入数据库|注入器|daily-report|daily_report|workbuddy 日志|DSH 会话/;
/** 候选工作日志根目录 */
const LOG_ROOTS = ['D:/Projects', 'D:/AI-Work'];

/**
 * 打印错误并退出
 * @param {string} msg - 描述
 * @returns {void}
 */
function die(msg) {
  console.error('[daily-report-auto] ' + msg);
  process.exit(1);
}

/**
 * 解析参数
 * @param {string[]} argv - 参数
 * @returns {Object} 配置
 */
function parseArgs(argv) {
  const o = { date: '', ssh: '', user: 6, apply: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => { const x = argv[++i]; if (x === undefined) die('参数缺少取值: ' + a); return x; };
    if (a === '--date') o.date = v();
    else if (a === '--ssh') o.ssh = v();
    else if (a === '--user') o.user = Number(v());
    else if (a === '--apply') o.apply = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else die('未知参数: ' + a);
  }
  return o;
}

/**
 * 上海时区当天
 * @returns {string} YYYY-MM-DD
 */
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * 日期加减
 * @param {string} d - 日期
 * @param {number} n - 天数
 * @returns {string} YYYY-MM-DD
 */
function addDays(d, n) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day) + n * 86400000).toISOString().slice(0, 10);
}

/**
 * 扫描所有 .workbuddy/memory 目录
 * @returns {string[]} 目录列表
 */
function findMemoryDirs() {
  const dirs = [];
  for (const root of LOG_ROOTS) {
    let entries = [];
    try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const candidates = [path.join(root, e.name, '.workbuddy', 'memory')];
      try {
        for (const sub of fs.readdirSync(path.join(root, e.name), { withFileTypes: true })) {
          if (sub.isDirectory()) candidates.push(path.join(root, e.name, sub.name, '.workbuddy', 'memory'));
        }
      } catch { /* ignore */ }
      for (const c of candidates) if (fs.existsSync(c)) dirs.push(c);
    }
  }
  return [...new Set(dirs)];
}

/**
 * 从 workbuddy 日志提取候选条目
 * @param {string[]} dirs - 日志目录
 * @param {string} date - 日期
 * @returns {{items: string[], plans: string[]}} 条目与计划
 */
function collectBuddy(dirs, date) {
  const items = [];
  const plans = [];
  for (const dir of dirs) {
    const file = path.join(dir, date + '.md');
    if (!fs.existsSync(file)) continue;
    const project = path.basename(path.dirname(path.dirname(dir))) || '工作';
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    let current = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      const h = /^#{2,3}\s+(.+)$/.exec(line);
      if (h) {
        current = h[1].replace(/^\d+[.、)]\s*/, '').trim();
        if (/待办|下一步|明日|遗留|未完成|续/.test(current)) plans.push(current.replace(/^[-*]\s*/, ''));
        else if (!EXCLUDE.test(current) && current.length >= 6 && !/^(经验|交付物|说明|结果|数据源|脚本|明细|踩过|关键|任务|目录)/.test(current)) {
          items.push(current.startsWith(project) ? current : project + '·' + current);
        }
        continue;
      }
      if (!current) continue;
      const bullet = /^[-*]\s+(.+)$/.exec(line);
      if (bullet && /待办|下一步|明日|遗留|未完成/.test(current) && !EXCLUDE.test(bullet[1])) {
        plans.push(bullet[1]);
      }
    }
  }
  return { items, plans };
}

/**
 * 还原 DSH 会话目录名里的 ~XX 编码（GBK 字节）
 * @param {string} s - 目录名
 * @returns {string} 可读名
 */
function decodeLabel(s) {
  if (!s.includes('~')) return s;
  // DSH 把非 ASCII 目录名编码成 ~XXXX（UTF-16 码元）
  return s.replace(/(?:~[0-9A-Fa-f]{4})+/g, m =>
    m.split('~').filter(Boolean).map(h => String.fromCharCode(parseInt(h, 16))).join('')
  );
}

/**
 * 拆分多帧 zstd
 * @param {Buffer} buf - 原始字节
 * @returns {Buffer[]} 帧数组
 */
function splitFrames(buf) {
  const magic = [0x28, 0xb5, 0x2f, 0xfd];
  const starts = [];
  for (let i = 0; i + 3 < buf.length; i++) {
    if (buf[i] === magic[0] && buf[i + 1] === magic[1] && buf[i + 2] === magic[2] && buf[i + 3] === magic[3]) starts.push(i);
  }
  const out = [];
  for (let k = 0; k < starts.length; k++) {
    const end = k + 1 < starts.length ? starts[k + 1] : buf.length;
    try { out.push(zlib.zstdDecompressSync(buf.subarray(starts[k], end))); } catch { /* skip */ }
  }
  return out;
}

/**
 * 从 DSH 会话提取当日用户诉求
 * @param {string} date - 日期
 * @returns {string[]} 条目
 */
function collectSessions(date) {
  const start = Date.parse(date + 'T00:00:00+08:00');
  const end = Date.parse(addDays(date, 1) + 'T00:00:00+08:00');
  const items = [];
  let projects = [];
  try { projects = fs.readdirSync(SESSIONS_ROOT); } catch { return items; }

  for (const proj of projects) {
    const projDir = path.join(SESSIONS_ROOT, proj);
    let sessions = [];
    try { sessions = fs.readdirSync(projDir); } catch { continue; }
    for (const s of sessions) {
      const file = path.join(projDir, s, 'session.v4.jsonl.zstd');
      if (!fs.existsSync(file)) continue;
      const st = fs.statSync(file);
      if (st.mtimeMs < start) continue;
      let text = '';
      try {
        text = splitFrames(fs.readFileSync(file)).map(b => b.toString('utf8')).join('');
      } catch { continue; }
      const rawName = decodeLabel(proj.replace(/^--/, '').replace(/--$/, ''));
      let label = rawName.split('-').pop();
      if (label === 'Work') label = 'AI-Work';
      for (const line of text.split(/\r?\n/)) {
        if (!line.includes('"session/title"')) continue;
        let ev;
        try { ev = JSON.parse(line); } catch { continue; }
        if (ev.time < start || ev.time >= end) continue;
        let title = String((ev.data && ev.data.title) || '').replace(/\s+/g, ' ').trim();
        if (title.length < 4 || EXCLUDE.test(title)) continue;
        // 会话标题常被截断在半句，取最后一个顿号/逗号前的主干
        if (title.length >= 12) {
          const cut = Math.max(title.lastIndexOf('，'), title.lastIndexOf('、'));
          if (cut >= 6) title = title.slice(0, cut);
        }
        items.push((label || 'DSH') + '·' + title.slice(0, 30));
      }
    }
  }
  return [...new Set(items)];
}

/**
 * 拼装正文（≤max 字）
 * @param {string[]} items - 条目
 * @param {number} max - 上限
 * @returns {string} 正文
 */
function compose(items, max) {
  const parts = [];
  let len = 0;
  for (const raw of items) {
    // 过长的条目去掉括号里的批次号等细节
    let it = raw.replace(/（(关键|重要|本轮新增|新增|续|补充|待定)）/g, '');
    if (it.length > 32) it = it.replace(/（[^）]{4,}）/g, '');
    const add = (parts.length ? 1 : 0) + it.length;
    if (len + add + 1 > max) continue;
    parts.push(it);
    len += add;
  }
  return parts.join('；').slice(0, max - 1) + '。';
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) {
    console.log('用法: node scripts/daily-report-auto.js --ssh srv [--date YYYY-MM-DD] [--user 6] [--apply]');
    return;
  }
  if (!o.ssh) die('必须指定 --ssh <host>（生产库在内网容器）');

  const date = o.date || today();
  if (date > today()) die('不能为未来日期生成日报: ' + date);

  const dirs = findMemoryDirs();
  const buddy = collectBuddy(dirs, date);
  const sessions = collectSessions(date);

  // 近似去重：同一项目下前 6 个字相同视为同一件事
  const seen = new Set();
  const all = [...new Set([...buddy.items, ...sessions])].filter(t => {
    if (EXCLUDE.test(t)) return false;
    const key = t.replace(/^[^·]*·/, '').slice(0, 6);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (all.length === 0) {
    console.log('当日无日志与会话记录，跳过: ' + date);
    return;
  }

  const todayText = compose(all, MAX_TODAY);
  // 明日计划：优先当日日志里的待办小节，其次次日日志的首个标题（回补历史日期时最准），最后兜底
  let nextTopic = '';
  for (const dir of dirs) {
    const nf = path.join(dir, addDays(date, 1) + '.md');
    if (!fs.existsSync(nf)) continue;
    try {
      const line = fs.readFileSync(nf, 'utf8').split(/\r?\n/).find(l => /^#{2,3}\s+(.+)$/.test(l.trim()));
      if (line) {
        const t = line.trim().replace(/^#{2,3}\s+/, '').replace(/^\d+[.、)]\s*/, '').replace(/（[^）]*）/g, '');
        if (t.length >= 8 && !/^[A-Za-z]\s/.test(t)) { nextTopic = t; break; }
      }
    } catch { /* ignore */ }
  }
  const planSrc = (buddy.plans.find(p => !EXCLUDE.test(p)) || nextTopic || '完成当日遗留事项并跟进反馈')
    .replace(/（[^）]*）?/g, '')
    .replace(/[，、；：\s]+$/, '')
    .trim();
  const plan = (planSrc || '完成当日遗留事项并跟进反馈').slice(0, MAX_PLAN - 1) + '。';

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const cacheFile = path.join(CACHE_DIR, date + '.json');
  fs.writeFileSync(cacheFile, JSON.stringify({ [date]: { today: todayText, tomorrow: plan } }, null, 2), 'utf8');

  console.log('日期: ' + date + '   来源: ' + dirs.length + ' 个 workbuddy 目录 + DSH 会话');
  console.log('候选 ' + all.length + ' 条:');
  for (const t of all.slice(0, 10)) console.log('  - ' + t);
  console.log('\n今日工作内容(' + todayText.length + '字): ' + todayText);
  console.log('明日计划(' + plan.length + '字): ' + plan);
  console.log('缓存: ' + path.relative(REPO_ROOT, cacheFile));

  if (!o.apply) {
    console.log('\n预览模式，未上传。确认后加 --apply。');
    return;
  }

  const out = execFileSync('node', [
    path.join(__dirname, 'daily-report-inject.js'),
    '--ssh', o.ssh, '--user', String(o.user),
    '--from', date, '--to', date,
    '--content', cacheFile, '--apply',
  ], { encoding: 'utf8' });
  console.log('\n' + out);
}

main().then(() => process.exit(0)).catch(e => { console.error('FATAL', e.message); process.exit(1); });
