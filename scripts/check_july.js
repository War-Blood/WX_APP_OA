const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: '127.0.0.1', user: 'daily_report_user',
    password: 'DailyReport@2024', database: 'wx_app_oa'
  });

  const [rows] = await pool.query(
    "SELECT DISTINCT workers FROM daily_reports WHERE status='approved' AND report_date >= '2026-07-01' AND workers IS NOT NULL AND workers!=''"
  );
  const [users] = await pool.query(
    "SELECT id, user_name FROM users WHERE worker_status='active' AND deleted_at IS NULL AND status='active'"
  );

  const nameToId = {};
  users.forEach(u => { nameToId[u.user_name] = u.id; });

  console.log('=== July 2026 worker name matching ===');
  let totalNames = 0;
  let unmatched = 0;

  rows.forEach(r => {
    const names = r.workers.split(/[、,，\s]+/).filter(n => n);
    names.forEach(n => {
      totalNames++;
      if (!nameToId[n]) {
        console.log(`NO_USER: "${n}" in "${r.workers}"`);
        unmatched++;
      }
    });
  });

  console.log(`\nTotal worker names found: ${totalNames}`);
  console.log(`Unmatched (no user account): ${unmatched}`);
  if (unmatched === 0) console.log('RESULT: ALL WORKERS MATCHED - 100% coverage');
  else console.log(`RESULT: ${unmatched} worker names have no user account`);

  await pool.end();
})();
