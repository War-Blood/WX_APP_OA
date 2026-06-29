/**
 * 脚本: fill-missing-dates.js
 * 功能: 填充 2026-06-20 之后日报中缺失的入场时间/出差时间
 * 逻辑: 对非请假记录，用同一人员历史最近的非空日期回填
 */

const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'wx_app_oa',
    waitForConnections: true,
    connectionLimit: 5,
  });

  // 1. 查出所有需填充的记录（非请假、日期为空）
  const [targets] = await pool.query(`
    SELECT id, report_date, workers, entry_date, initial_biz_trip_date, today_work_type
    FROM daily_reports
    WHERE report_date > '2026-06-20'
      AND entry_date IS NULL
      AND initial_biz_trip_date IS NULL
      AND (today_work_type IS NULL OR today_work_type != '请假')
    ORDER BY report_date, id
  `);

  console.log(`需处理记录数: ${targets.length}`);

  let fillCount = 0;
  let noHistoryCount = 0;
  let skippedNull = 0;

  for (const row of targets) {
    // 提取首个工人姓名
    if (!row.workers || row.workers.trim() === '') {
      skippedNull++;
      console.log(`[跳过] ID=${row.id} workers为空`);
      continue;
    }

    // 取第一个工人名（用、或空格分隔）
    const primaryWorker = row.workers.split(/[、,，\s]+/).filter(n => n.trim())[0];
    if (!primaryWorker) {
      skippedNull++;
      continue;
    }

    // 2. 查找该工人历史最近的非空入场时间
    const [entryRows] = await pool.query(`
      SELECT dr.entry_date
      FROM daily_reports dr
      WHERE dr.report_date < '2026-06-21'
        AND dr.entry_date IS NOT NULL
        AND dr.workers LIKE ?
        AND dr.status = 'approved'
      ORDER BY dr.report_date DESC
      LIMIT 1
    `, [`%${primaryWorker}%`]);

    // 3. 查找该工人历史最近的非空出差时间
    const [tripRows] = await pool.query(`
      SELECT dr.initial_biz_trip_date
      FROM daily_reports dr
      WHERE dr.report_date < '2026-06-21'
        AND dr.initial_biz_trip_date IS NOT NULL
        AND dr.workers LIKE ?
        AND dr.status = 'approved'
      ORDER BY dr.report_date DESC
      LIMIT 1
    `, [`%${primaryWorker}%`]);

    const newEntry = entryRows[0]?.entry_date || null;
    const newTrip = tripRows[0]?.initial_biz_trip_date || null;

    if (!newEntry && !newTrip) {
      noHistoryCount++;
      console.log(`[无历史] ID=${row.id} date=${row.report_date} worker=${primaryWorker} ← 无历史数据可填充`);
      continue;
    }

    // 4. 更新
    const updates = [];
    const params = [];
    if (newEntry) {
      updates.push('entry_date = ?');
      params.push(newEntry);
    }
    if (newTrip) {
      updates.push('initial_biz_trip_date = ?');
      params.push(newTrip);
    }
    params.push(row.id);

    await pool.query(
      `UPDATE daily_reports SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    fillCount++;
    console.log(`[填充] ID=${row.id} date=${row.report_date} worker=${primaryWorker} entry=${newEntry || '—'} trip=${newTrip || '—'}`);
  }

  // 汇总
  console.log('\n========================================');
  console.log(`总记录: ${targets.length}`);
  console.log(`已填充: ${fillCount}`);
  console.log(`无历史数据: ${noHistoryCount}`);
  console.log(`跳过(workers为空): ${skippedNull}`);
  console.log('========================================');

  await pool.end();
}

main().catch(err => {
  console.error('脚本执行失败:', err);
  process.exit(1);
});
