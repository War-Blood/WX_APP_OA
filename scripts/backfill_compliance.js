'use strict';

/**
 * 历史合规数据回填
 * 按 (project, report_date) 分组，合并同天同项目的多条日报
 */
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '111.229.107.123', port: 3306,
  user: 'daily_report_user', password: 'DailyReport@2024',
  database: 'wx_app_oa', charset: 'utf8mb4',
};

function splitWorkers(str) {
  if (!str) return [];
  return str.split(/[、,，]/).map(s => s.trim()).filter(Boolean);
}

function mergeWorkers(groupRows) {
  const set = new Set();
  for (const r of groupRows) {
    for (const w of splitWorkers(r.workers)) {
      set.add(w);
    }
  }
  return { names: [...set], str: [...set].join('、') };
}

async function main() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('数据库连接成功\n');

  // 1. 读取所有已通过日报
  const [reports] = await conn.execute(
    `SELECT id, report_date, project, workers, submitted_at 
     FROM daily_reports 
     WHERE status = 'approved' AND deleted_at IS NULL
     ORDER BY project, report_date, id ASC`
  );
  console.log(`读取到 ${reports.length} 条日报`);

  // 2. 按 (project, report_date) 分组
  const groups = new Map();
  for (const r of reports) {
    const key = `${r.project || '__NULL__'}|${r.report_date.toISOString().split('T')[0]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  console.log(`分组后: ${groups.size} 个唯一(项目,日期)组合`);

  // 3. 逐组创建合规记录
  let complianceCount = 0;
  let workerCount = 0;
  const batchSize = 200;
  let workerBatch = [];
  let done = 0;

  for (const [key, groupRows] of groups) {
    const first = groupRows[0];
    const project = first.project || '(未指定项目)';
    const deadline = new Date(first.report_date);
    deadline.setHours(23, 59, 59, 999);

    const merged = mergeWorkers(groupRows);

    const [result] = await conn.execute(
      `INSERT INTO report_compliance (report_id, project, workers, report_date, timeliness, submit_time, expected_deadline, is_auto_approved)
       VALUES (?, ?, ?, ?, 'on_time', ?, ?, 1)`,
      [first.id, project, merged.str, first.report_date, first.submitted_at, deadline]
    );
    const complianceId = result.insertId;
    complianceCount++;

    // 拆分 workers → worker_compliance
    for (const name of merged.names) {
      workerBatch.push([complianceId, name, first.report_date, 'on_time']);
    }

    // 批量写入
    if (workerBatch.length >= batchSize) {
      const placeholders = workerBatch.map(() => '(?, ?, ?, ?)').join(',');
      await conn.execute(
        `INSERT INTO worker_compliance (compliance_id, worker_name, report_date, timeliness) VALUES ${placeholders}`,
        workerBatch.flat()
      );
      workerCount += workerBatch.length;
      workerBatch = [];
    }

    done++;
    if (done % 200 === 0) process.stdout.write(`\r  进度: ${done}/${groups.size}`);
  }

  // 写入剩余
  if (workerBatch.length > 0) {
    const placeholders = workerBatch.map(() => '(?, ?, ?, ?)').join(',');
    await conn.execute(
      `INSERT INTO worker_compliance (compliance_id, worker_name, report_date, timeliness) VALUES ${placeholders}`,
      workerBatch.flat()
    );
    workerCount += workerBatch.length;
  }

  console.log(`\n\n========== 回填完成 ==========`);
  console.log(`  report_compliance: ${complianceCount} 条 (${groups.size} 唯一组合)`);
  console.log(`  worker_compliance: ${workerCount} 条`);

  // 4. 聚合月度统计
  console.log('\n聚合月度统计...');
  await conn.execute(`TRUNCATE TABLE user_compliance_stats`);
  await conn.execute(`
    INSERT INTO user_compliance_stats (user_id, stat_month, total_reports, on_time_count, delayed_count, missing_count, on_time_rate)
    SELECT 
      1, DATE_FORMAT(report_date, '%Y-%m'),
      COUNT(*),
      SUM(CASE WHEN timeliness='on_time' THEN 1 ELSE 0 END),
      SUM(CASE WHEN timeliness='delayed' THEN 1 ELSE 0 END),
      SUM(CASE WHEN timeliness='missing' THEN 1 ELSE 0 END),
      ROUND(SUM(CASE WHEN timeliness='on_time' THEN 1 ELSE 0 END)/COUNT(*)*100, 2)
    FROM report_compliance
    GROUP BY DATE_FORMAT(report_date, '%Y-%m')
  `);

  // 5. 验证
  const [cnt1] = await conn.execute('SELECT COUNT(*) as c FROM report_compliance');
  const [cnt2] = await conn.execute('SELECT COUNT(*) as c FROM worker_compliance');
  const [cnt3] = await conn.execute('SELECT COUNT(*) as c FROM user_compliance_stats');
  console.log(`\n验证:`);
  console.log(`  report_compliance: ${cnt1[0].c} 条`);
  console.log(`  worker_compliance: ${cnt2[0].c} 条`);
  console.log(`  user_compliance_stats: ${cnt3[0].c} 行`);

  // 抽样
  const [sample] = await conn.execute(`
    SELECT project, report_date, timeliness, workers FROM report_compliance ORDER BY id DESC LIMIT 5
  `);
  console.log('\n=== 抽样 ===');
  sample.forEach(s => console.log(`  ${s.report_date.toISOString().split('T')[0]} | ${(s.project||'').substring(0,30)} | ${s.timeliness} | workers: ${(s.workers||'').substring(0,30)}`));

  await conn.end();
}

main().catch(err => {
  console.error('回填失败:', err);
  process.exit(1);
});
