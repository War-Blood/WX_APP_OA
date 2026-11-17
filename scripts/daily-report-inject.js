#!/usr/bin/env node
'use strict';

/**
 * @file 日报注入器 — 按 OA 出勤日历把工作日报直接写入 daily_reports（不经过小程序/接口）。
 *
 * 流程：company_schedules 取工作日 → 读内容（--content JSON）→ 幂等校验 → INSERT / UPDATE
 *
 * 用法：
 *   node scripts/daily-report-inject.js --user 6 --from 2026-11-01 --to 2026-11-17 --content scripts/daily-report-nov.json
 *   node scripts/daily-report-inject.js ... --apply            # 仅补缺失日期
 *   node scripts/daily-report-inject.js ... --apply --update   # 已存在也覆盖正文
 */

const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..');
process.chdir(path.join(REPO_ROOT, 'backend'));
const db = require(path.join(REPO_ROOT, 'backend', 'src', 'common', 'config', 'database'));

const OFFICE = {
  project: '公司日报',
  area: '浙江-温州-乐清',
  todayWorkType: '公司',
  reportType: 'office',
  status: 'approved',
  timeliness: 'on_time',
};

/**
 * 打印错误并退出
 * @param {string} message - 错误描述
 * @returns {void}
 */
function die(message) {
  console.error('[daily-report-inject] ' + message);
  process.exit(1);
}

/**
 * 解析命令行参数
 * @param {string[]} argv - 参数数组
 * @returns {Object} 参数对象
 */
function parseArgs(argv) {
  const opts = { user: 0, from: '', to: '', content: '', apply: false, update: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => { const x = argv[++i]; if (x === undefined) die('参数缺少取值: ' + a); return x; };
    if (a === '--user') opts.user = Number(v());
    else if (a === '--from') opts.from = v();
    else if (a === '--to') opts.to = v();
    else if (a === '--content') opts.content = v();
    else if (a === '--apply') opts.apply = true;
    else if (a === '--update') opts.update = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else die('未知参数: ' + a);
  }
  return opts;
}

/**
 * 当前日期（上海时区）
 * @returns {string} YYYY-MM-DD
 */
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * 当前时间戳（上海时区，YYYY-MM-DD HH:mm:ss）
 * @returns {string} 时间字符串
 */
function nowStamp() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * 日报入库行
 * @param {number} userId - 用户 ID
 * @param {string} date - 报告日期
 * @param {Object} c - 内容 { today, tomorrow, issues, coordination }
 * @param {string} submitter - 提交人姓名
 * @returns {Object} 字段对象
 */
function buildRow(userId, date, c, submitter) {
  const isToday = date === today();
  const stamp = isToday ? nowStamp() : date + ' 18:00:00';
  return {
    user_id: userId,
    report_date: date,
    report_type: OFFICE.reportType,
    project: OFFICE.project,
    area: OFFICE.area,
    today_work_type: OFFICE.todayWorkType,
    today_work: c.today,
    tomorrow_plan: c.tomorrow || null,
    issues: c.issues || null,
    content: c.coordination || null,
    status: OFFICE.status,
    timeliness: OFFICE.timeliness,
    submitter_name: submitter,
    worker_count: 0,
    submitted_at: stamp,
    created_at: stamp,
    updated_at: stamp,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.user || !opts.from || !opts.to) {
    console.log('用法: node scripts/daily-report-inject.js --user <id> --from <YYYY-MM-DD> --to <YYYY-MM-DD> [--content <json>] [--apply] [--update]');
    return;
  }

  const userRows = await db.query('SELECT id, nickname FROM users WHERE id = ?', [opts.user]);
  if (userRows.length === 0) die('用户不存在: ' + opts.user);
  const submitter = userRows[0].nickname;

  let content = {};
  if (opts.content) {
    const file = path.resolve(REPO_ROOT, opts.content);
    if (!fs.existsSync(file)) die('内容文件不存在: ' + file);
    content = JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  const workdays = await db.query(
    "SELECT DATE_FORMAT(schedule_date,'%Y-%m-%d') d FROM company_schedules WHERE status = 'work' AND schedule_date BETWEEN ? AND ? ORDER BY schedule_date",
    [opts.from, opts.to]
  );
  const existing = await db.query(
    "SELECT DATE_FORMAT(report_date,'%Y-%m-%d') d FROM daily_reports WHERE user_id = ? AND report_date BETWEEN ? AND ? AND deleted_at IS NULL",
    [opts.user, opts.from, opts.to]
  );
  const has = new Set(existing.map(r => r.d));

  const toInsert = [];
  const toUpdate = [];
  const missing = [];

  for (const { d } of workdays) {
    if (d > today()) { missing.push(d + '(未来)'); continue; }
    const c = content[d];
    if (!c || !c.today) {
      if (!has.has(d)) missing.push(d + '(无内容)');
      continue;
    }
    const row = buildRow(opts.user, d, c, submitter);
    if (has.has(d)) { if (opts.update) toUpdate.push(row); }
    else toInsert.push(row);
  }

  console.log('用户: ' + submitter + ' (id=' + opts.user + ')  区间: ' + opts.from + ' ~ ' + opts.to);
  console.log('工作日 ' + workdays.length + ' 天 | 新增 ' + toInsert.length + ' | 覆盖 ' + toUpdate.length + ' | 缺内容 ' + missing.length);
  for (const r of toInsert) console.log('  + ' + r.report_date + '  ' + r.today_work.length + '字  ' + r.today_work);
  for (const r of toUpdate) console.log('  ~ ' + r.report_date + '  ' + r.today_work.length + '字  ' + r.today_work);
  if (missing.length > 0) console.log('未处理: ' + missing.join(', '));

  if (!opts.apply) {
    console.log('\n预览模式，未写库。确认后加 --apply。');
    return;
  }

  let changed = 0;
  for (const row of toInsert) {
    const cols = Object.keys(row);
    const sql = 'INSERT INTO daily_reports (' + cols.join(',') + ') VALUES (' + cols.map(() => '?').join(',') + ')';
    try { await db.query(sql, cols.map(k => row[k])); changed++; }
    catch (e) { console.error('  ✗ INSERT ' + row.report_date + ' ' + e.message); }
  }
  for (const row of toUpdate) {
    try {
      await db.query(
        "UPDATE daily_reports SET report_type=?, project=?, area=?, today_work_type=?, today_work=?, tomorrow_plan=?, issues=?, content=?, status=?, timeliness=?, submitter_name=?, worker_count=?, updated_at=? WHERE user_id=? AND report_date=? AND deleted_at IS NULL",
        [row.report_type, row.project, row.area, row.today_work_type, row.today_work, row.tomorrow_plan, row.issues, row.content, row.status, row.timeliness, row.submitter_name, row.worker_count, nowStamp(), row.user_id, row.report_date]
      );
      changed++;
    } catch (e) { console.error('  ✗ UPDATE ' + row.report_date + ' ' + e.message); }
  }
  console.log('\n写入/更新 ' + changed + ' 条');
}

main().then(() => process.exit(0)).catch(e => { console.error('FATAL', e.message); process.exit(1); });
