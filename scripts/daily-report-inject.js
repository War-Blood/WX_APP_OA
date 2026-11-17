#!/usr/bin/env node
'use strict';

/**
 * @file 日报注入器 — 按 OA 出勤日历把工作日报写入 daily_reports。
 *
 * 生产库在**内网 172.15.20.20 的 oa-mysql 容器**（11-05 隧道迁移后），云服务器 3306 是冻结的旧库。
 * 因此默认推荐 --ssh srv：通过 SSH 进容器执行 SQL，并强制 utf8mb4（否则中文按 latin1 落库会翻倍）。
 *
 * 用法：
 *   node scripts/daily-report-inject.js --ssh srv --user 6 --from 2026-11-01 --to 2026-11-16 --content scripts/daily-report-nov.json
 *   加 --apply 写入；加 --update 覆盖已存在日期
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const REMOTE = 'set -a; . <(docker exec oa-backend printenv | grep "^OA_DB_"); set +a; docker exec -i -e MYSQL_PWD="$OA_DB_PASSWORD" oa-mysql mysql --default-character-set=utf8mb4 -u"$OA_DB_USER" -N -B "$OA_DB_NAME"';

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
 * @param {string} message - 描述
 * @returns {void}
 */
function die(message) {
  console.error('[daily-report-inject] ' + message);
  process.exit(1);
}

/**
 * 解析参数
 * @param {string[]} argv - 参数
 * @returns {Object} 配置
 */
function parseArgs(argv) {
  const o = { user: 0, from: '', to: '', content: '', ssh: '', apply: false, update: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const v = () => { const x = argv[++i]; if (x === undefined) die('参数缺少取值: ' + a); return x; };
    if (a === '--user') o.user = Number(v());
    else if (a === '--from') o.from = v();
    else if (a === '--to') o.to = v();
    else if (a === '--content') o.content = v();
    else if (a === '--ssh') o.ssh = v();
    else if (a === '--apply') o.apply = true;
    else if (a === '--update') o.update = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else die('未知参数: ' + a);
  }
  return o;
}

/**
 * 当前日期（上海）
 * @returns {string} YYYY-MM-DD
 */
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/**
 * 生成 SQL 字面量
 * @param {*} v - 值
 * @returns {string} SQL 片段
 */
function lit(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return String(v);
  return "'" + String(v).replace(/'/g, "''") + "'";
}

/**
 * 通过 SSH 执行 SQL
 * @param {string} host - SSH 主机别名
 * @param {string} sql - SQL 文本
 * @returns {string} 输出
 */
function mysql(host, sql) {
  try {
    return execFileSync('ssh', ['-o', 'BatchMode=yes', host, REMOTE], { input: sql, encoding: 'utf8' });
  } catch (e) {
    die('SSH 执行失败: ' + (e.stderr || e.message).toString().slice(0, 300));
  }
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help || !o.user || !o.from || !o.to) {
    console.log('用法: node scripts/daily-report-inject.js --ssh <host> --user <id> --from <YYYY-MM-DD> --to <YYYY-MM-DD> [--content <json>] [--apply] [--update]');
    return;
  }
  if (!o.ssh) die('必须指定 --ssh <host>（生产库在内网容器；本地 backend/.env 指向的是迁移前旧库）');

  const content = o.content
    ? JSON.parse(fs.readFileSync(path.resolve(REPO_ROOT, o.content), 'utf8'))
    : {};
  if (!content || Object.keys(content).length === 0) die('缺少内容文件: --content');

  const nick = mysql(o.ssh, 'SELECT nickname FROM users WHERE id = ' + Number(o.user) + ';').trim();
  if (!nick) die('用户不存在: ' + o.user);

  const workdays = mysql(o.ssh,
    "SELECT DATE_FORMAT(schedule_date,'%Y-%m-%d') FROM company_schedules WHERE status='work' AND schedule_date BETWEEN " +
    lit(o.from) + ' AND ' + lit(o.to) + ' ORDER BY schedule_date;'
  ).split(/\r?\n/).filter(Boolean);

  const existing = new Set(mysql(o.ssh,
    "SELECT DATE_FORMAT(report_date,'%Y-%m-%d') FROM daily_reports WHERE user_id=" + Number(o.user) +
    ' AND report_date BETWEEN ' + lit(o.from) + ' AND ' + lit(o.to) + ' AND deleted_at IS NULL;'
  ).split(/\r?\n/).filter(Boolean));

  const inserts = [];
  const updates = [];
  const missing = [];

  for (const d of workdays) {
    if (d > today()) { missing.push(d + '(未来)'); continue; }
    const c = content[d];
    if (!c || !c.today) { if (!existing.has(d)) missing.push(d + '(无内容)'); continue; }
    const stamp = d + ' 18:00:00';
    const row = {
      user_id: o.user, report_date: d, report_type: OFFICE.reportType, project: OFFICE.project,
      area: OFFICE.area, today_work_type: OFFICE.todayWorkType, today_work: c.today,
      tomorrow_plan: c.tomorrow || null, issues: c.issues || null, content: c.coordination || null,
      status: OFFICE.status, timeliness: OFFICE.timeliness, submitter_name: nick,
      worker_count: 0, submitted_at: stamp, created_at: stamp, updated_at: stamp,
    };
    if (existing.has(d)) { if (o.update) updates.push(row); }
    else inserts.push(row);
  }

  const mark = r => r.report_date + '  ' + r.today_work.length + '字' + (r.today_work.length > 100 ? ' ⚠️超100字' : '');
  console.log('用户: ' + nick + ' (id=' + o.user + ')  ' + o.from + ' ~ ' + o.to + '  @' + o.ssh);
  console.log('工作日 ' + workdays.length + ' | 新增 ' + inserts.length + ' | 覆盖 ' + updates.length + ' | 缺内容 ' + missing.length);
  for (const r of inserts) console.log('  + ' + mark(r) + '  ' + r.today_work);
  for (const r of updates) console.log('  ~ ' + mark(r) + '  ' + r.today_work);
  if (missing.length) console.log('未处理: ' + missing.join(', '));

  if (!o.apply) { console.log('\n预览模式，未写库。确认后加 --apply。'); return; }

  const stmts = ['SET NAMES utf8mb4;'];
  if (inserts.length) {
    const cols = Object.keys(inserts[0]);
    stmts.push('INSERT INTO daily_reports (' + cols.join(',') + ') VALUES\n' +
      inserts.map(r => '(' + cols.map(c => lit(r[c])).join(',') + ')').join(',\n') + ';');
  }
  for (const r of updates) {
    stmts.push('UPDATE daily_reports SET ' +
      ['report_type','project','area','today_work_type','today_work','tomorrow_plan','issues','content','status','timeliness','submitter_name','worker_count']
        .map(c => c + '=' + lit(r[c])).join(', ') +
      ", updated_at='" + r.report_date + " 18:00:00' WHERE user_id=" + o.user + ' AND report_date=' + lit(r.report_date) + ';');
  }

  if (stmts.length > 1) {
    mysql(o.ssh, stmts.join('\n') + '\n');
    console.log('\n写入/更新 ' + (inserts.length + updates.length) + ' 条');
  } else {
    console.log('\n无变更');
  }
}

main().then(() => process.exit(0)).catch(e => { console.error('FATAL', e.message); process.exit(1); });
