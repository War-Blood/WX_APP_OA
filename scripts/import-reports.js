'use strict';

/**
 * 日报数据导入脚本
 * 从 TSV 文件读取日报数据，去重后导入 wx_app_oa.daily_reports 表
 * 使用: node scripts/import-reports.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// 数据库配置（同服务器 .env）
const DB_CONFIG = {
  host: process.env.OA_DB_HOST || '111.229.107.123',
  port: parseInt(process.env.OA_DB_PORT || '3306'),
  user: process.env.OA_DB_USER || 'daily_report_user',
  password: process.env.OA_DB_PASSWORD || 'DailyReport@2024',
  database: process.env.OA_DB_NAME || 'wx_app_oa',
  charset: 'utf8mb4',
};

// 解析进度百分比
function parseProgress(val) {
  if (!val || val.trim() === '' || val === '#DIV/0!') return null;
  const s = val.trim().replace('%', '');
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return (n / 100).toFixed(4);
}

// 解析日期 (YYYY/MM/DD → YYYY-MM-DD)
function parseDate(val) {
  if (!val || val.trim() === '') return null;
  return val.trim().replace(/\//g, '-');
}

// 解析数字
function parseNum(val) {
  if (!val || val.trim() === '' || val === '#DIV/0!') return null;
  const n = parseFloat(val.trim());
  return isNaN(n) ? null : n;
}

async function main() {
  const tsvPath = path.join(__dirname, 'import_reports.tsv');
  const content = fs.readFileSync(tsvPath, 'utf-8');
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 跳过表头
  const header = lines[0].split('\t');
  console.log(`表头: ${header.length} 列`);
  console.log(`数据行: ${lines.length - 1}`);

  // 解析每一行
  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 10) {
      console.warn(`跳过行 ${i+1}: 列数不足 (${cols.length})`);
      continue;
    }

    // TSV 列索引（来自 WPS 导出）:
    // 0=report_date, 1=entry_date, 2=initial_biz_trip_date,
    // 3=project, 4=area, 5=related_party, 6=workers, 7=submitter,
    // 8=machine_model, 9=worker_count, 10=work_content(详细工作描述),
    // 11=required_qty, 12=completed_qty, 13=progress_percent,
    // 14=today_work(当日工作小结), 15=tomorrow_plan(明天工作内容),
    // 16=today_work_type(今日工作类型), 17=tomorrow_work_type(明日工作类型),
    // 18=biz_trip_days(项目出差天数), 19=personal_biz_trip_days(个人累计出差)
    const rec = {
      report_date: parseDate(cols[0]),
      entry_date: parseDate(cols[1]),
      initial_biz_trip_date: parseDate(cols[2]),
      project: cols[3] || null,
      area: cols[4] || null,
      related_party: cols[5] || null,
      workers: cols[6] || null,
      submitter_name: cols[7] || null,
      machine_model: cols[8] || null,
      worker_count: parseNum(cols[9]),
      // cols[10] = 详细工作描述 → DB work_content
      work_content: cols[10] || null,
      required_qty: parseNum(cols[11]),
      completed_qty: parseNum(cols[12]),
      progress_percent: parseProgress(cols[13]),
      // cols[14] = 当日工作小结 → DB today_work
      today_work: cols[14] || null,
      // cols[15] = 明天工作内容 → DB tomorrow_plan
      tomorrow_plan: cols[15] || null,
      // cols[16] = 今日工作类型 → DB today_work_type
      today_work_type: cols[16] || null,
      // cols[17] = 明日工作类型 → DB tomorrow_work_type
      tomorrow_work_type: cols[17] || null,
      // cols[18] = 项目出差天数 → DB biz_trip_days
      biz_trip_days: parseNum(cols[18]),
      // cols[19] = 个人累计出差 → DB personal_biz_trip_days
      personal_biz_trip_days: parseNum(cols[19]),
    };

    if (!rec.report_date) {
      console.warn(`跳过行 ${i+1}: 缺少日期`);
      continue;
    }

    records.push(rec);
  }

  console.log(`解析完成: ${records.length} 条有效记录`);

  // 连接数据库
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log(`\n数据库连接成功: ${DB_CONFIG.host}/${DB_CONFIG.database}`);

  try {
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const rec of records) {
      try {
        // 去重检查：按 (report_date, project, workers) 判定
        const [rows] = await conn.execute(
          'SELECT id FROM daily_reports WHERE report_date = ? AND project = ? AND workers = ? AND deleted_at IS NULL LIMIT 1',
          [rec.report_date, rec.project, rec.workers]
        );

        if (rows.length > 0) {
          console.log(`  [跳过] ${rec.report_date} | ${rec.project} | ${rec.workers?.slice(0, 10)}... (已存在)`);
          skipped++;
          continue;
        }

        // 插入新记录
        const [result] = await conn.execute(
          `INSERT INTO daily_reports (
            user_id, report_date, project, area, work_content,
            today_work_type, tomorrow_work_type, workers, machine_model,
            worker_count, required_qty, completed_qty, progress_percent,
            today_work, tomorrow_plan, entry_date, initial_biz_trip_date,
            related_party, biz_trip_days, personal_biz_trip_days,
            submitter_name, status, timeliness, submitted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'on_time', NOW())`,
          [
            1, // user_id = 系统管理员
            rec.report_date,
            rec.project,
            rec.area,
            rec.work_content,
            rec.today_work_type,
            rec.tomorrow_work_type,
            rec.workers,
            rec.machine_model,
            rec.worker_count,
            rec.required_qty,
            rec.completed_qty,
            rec.progress_percent,
            rec.today_work,
            rec.tomorrow_plan,
            rec.entry_date,
            rec.initial_biz_trip_date,
            rec.related_party,
            rec.biz_trip_days,
            rec.personal_biz_trip_days,
            rec.submitter_name,
          ]
        );
        console.log(`  [新增] ${rec.report_date} | ${rec.project} | ${rec.workers?.slice(0, 10)}... (id=${result.insertId})`);
        inserted++;
      } catch (err) {
        console.error(`  [错误] ${rec.report_date} | ${rec.project}: ${err.message}`);
        errors++;
      }
    }

    console.log(`\n========== 导入完成 ==========`);
    console.log(`  总计: ${records.length}`);
    console.log(`  新增: ${inserted}`);
    console.log(`  跳过(重复): ${skipped}`);
    console.log(`  错误: ${errors}`);
  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
