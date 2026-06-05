'use strict';

/**
 * 从公出日志原始记录表.xlsx 导入全部 1813 条记录到 daily_reports
 * 会清空表后重新导入，确保数据库与 Excel 完全一致
 * 使用: node scripts/import-from-excel.js
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const XLSX = require('xlsx');

// 数据库配置
const DB_CONFIG = {
  host: process.env.OA_DB_HOST || '111.229.107.123',
  port: parseInt(process.env.OA_DB_PORT || '3306'),
  user: process.env.OA_DB_USER || 'daily_report_user',
  password: process.env.OA_DB_PASSWORD || 'DailyReport@2024',
  database: process.env.OA_DB_NAME || 'wx_app_oa',
  charset: 'utf8mb4',
};

// Excel 日期序列号 → YYYY-MM-DD
function excelSerialToDate(serial) {
  if (serial == null || typeof serial !== 'number') return null;
  const msSinceEpoch = (serial - 25569) * 86400 * 1000;
  const date = new Date(msSinceEpoch);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// 解析数字（整数）
function parseIntVal(val) {
  if (val == null || val === '') return 0;
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

// 解析进度（Excel 中的小数 0.3333 → 0.3333 存为 decimal）
function parseProgress(val) {
  if (val == null || val === '' || val === '#DIV/0!') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n.toFixed(4);
}

async function main() {
  // 1. 读取 Excel
  const excelPath = 'C:/Users/WarBlood/Downloads/(技术工程中心公出日志记录)公出日志原始记录表.xlsx';
  if (!fs.existsSync(excelPath)) {
    console.error('错误: 找不到 Excel 文件');
    console.error('请确认文件路径:', excelPath);
    process.exit(1);
  }

  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  console.log(`Excel 总行数: ${rows.length} (含表头)`);
  console.log(`数据行数: ${rows.length - 1}`);

  // 2. 解析为记录
  // Excel 列索引（0-based）:
  //   0=日报时间, 1=填写人, 2=入场时间, 3=初始出差时间,
  //   4=项目名称, 5=项目所在区域, 6=相关方单位,
  //   7=作业人员1, 8=作业人员2, 9=机型, 10=人数,
  //   11=从事工作内容, 12=需要完成数量, 13=累计完成数量,
  //   14=当前进度, 15=当日工作小结, 16=明天工作内容,
  //   17=今日工作类型, 18=明日工作类型, 19=备注,
  //   20=项目出差天数, 21=个人累计出差

  const records = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];

    // 构建 workers: 合并作业人员1 + 作业人员2
    let worker1 = r[7] ? String(r[7]).trim() : '';
    let worker2 = r[8] ? String(r[8]).trim() : '';
    let workers = worker1;
    if (worker2 && worker2 !== worker1) {
      workers = worker1 ? `${worker1}、${worker2}` : worker2;
    }

    const rec = {
      report_date: excelSerialToDate(r[0]),
      submitter_name: r[1] ? String(r[1]).trim() : null,
      entry_date: excelSerialToDate(r[2]),
      initial_biz_trip_date: excelSerialToDate(r[3]),
      project: r[4] ? String(r[4]).trim() : null,
      area: r[5] ? String(r[5]).trim() : null,
      related_party: r[6] ? String(r[6]).trim() : null,
      workers: workers || null,
      machine_model: r[9] ? String(r[9]).trim() : null,
      worker_count: parseIntVal(r[10]),
      work_content: r[11] ? String(r[11]).trim() : null,
      required_qty: parseIntVal(r[12]),
      completed_qty: parseIntVal(r[13]),
      progress_percent: parseProgress(r[14]),
      today_work: r[15] ? String(r[15]).trim() : null,
      tomorrow_plan: r[16] ? String(r[16]).trim() : null,
      today_work_type: r[17] ? String(r[17]).trim() : null,
      tomorrow_work_type: r[18] ? String(r[18]).trim() : null,
      remark: r[19] ? String(r[19]).trim() : null,
      biz_trip_days: parseIntVal(r[20]),
      personal_biz_trip_days: parseIntVal(r[21]),
    };

    if (!rec.report_date) {
      console.warn(`  跳过行 ${i + 1}: 缺少日报时间`);
      continue;
    }

    records.push(rec);
  }

  console.log(`解析完成: ${records.length} 条有效记录`);

  // 3. 连接数据库
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log(`\n数据库连接成功: ${DB_CONFIG.host}/${DB_CONFIG.database}`);

  try {
    // 4. 清空表（重置自增主键）
    console.log('\n清空 daily_reports 表...');
    await conn.execute('DELETE FROM daily_reports');
    await conn.execute('ALTER TABLE daily_reports AUTO_INCREMENT = 1');
    console.log('  已清空，AUTO_INCREMENT 已重置');

    // 5. 插入所有记录
    console.log('\n开始导入...');
    let inserted = 0;
    let errors = 0;

    // 使用批量插入提高性能
    const batchSize = 100;
    for (let batchStart = 0; batchStart < records.length; batchStart += batchSize) {
      const batch = records.slice(batchStart, batchStart + batchSize);
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
      
      const values = [];
      for (const rec of batch) {
        values.push(
          1, // user_id = 系统管理员
          rec.report_date,
          rec.project,
          null, // content
          rec.work_content,
          rec.today_work_type,
          rec.tomorrow_work_type,
          rec.workers,
          rec.machine_model,
          rec.worker_count,
          rec.required_qty,
          rec.completed_qty,
          rec.progress_percent,
          rec.remark,
          rec.entry_date,
          rec.initial_biz_trip_date,
          rec.related_party,
          rec.personal_biz_trip_days,
          rec.biz_trip_days,
          rec.submitter_name,
          'approved', // status
          'on_time', // timeliness
          new Date(), // submitted_at
          rec.today_work,
          rec.tomorrow_plan,
          rec.area,
        );
      }

      try {
        const [result] = await conn.execute(
          `INSERT INTO daily_reports (
            user_id, report_date, project, content, work_content,
            today_work_type, tomorrow_work_type, workers, machine_model,
            worker_count, required_qty, completed_qty, progress_percent,
            remark, entry_date, initial_biz_trip_date, related_party,
            personal_biz_trip_days, biz_trip_days, submitter_name,
            status, timeliness, submitted_at,
            today_work, tomorrow_plan, area
          ) VALUES ${placeholders}`,
          values
        );
        inserted += batch.length;
        process.stdout.write(`\r  已插入 ${inserted}/${records.length} 条...`);
      } catch (err) {
        console.error(`\n  批量插入错误 (${batchStart}-${batchStart + batch.length}): ${err.message}`);
        errors++;
      }
    }

    console.log(`\n\n========== 导入完成 ==========`);
    console.log(`  总计: ${records.length}`);
    console.log(`  新增: ${inserted}`);
    console.log(`  错误: ${errors}`);

    // 6. 验证
    const [cnt] = await conn.execute('SELECT COUNT(*) as c FROM daily_reports');
    const [cntApproved] = await conn.execute('SELECT COUNT(*) as c FROM daily_reports WHERE status = "approved"');
    const [maxId] = await conn.execute('SELECT MAX(id) as m FROM daily_reports');
    console.log(`\n验证:`);
    console.log(`  daily_reports 总数: ${cnt[0].c}`);
    console.log(`  approved 数量: ${cntApproved[0].c}`);
    console.log(`  最大 id: ${maxId[0].m}`);

  } finally {
    await conn.end();
  }
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
