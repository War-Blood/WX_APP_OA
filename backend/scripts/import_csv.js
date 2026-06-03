/**
 * 公出日志 CSV → wx_app_oa.daily_reports 导入脚本
 * 用法: node scripts/import_csv.js "C:/Users/WarBlood/Desktop/公出日志原始记录表.csv"
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2] || 'C:/Users/WarBlood/Desktop/公出日志原始记录表.csv';

if (!fs.existsSync(csvPath)) {
  console.error('CSV 文件不存在: ' + csvPath);
  process.exit(1);
}

// ============== Phase 1: ALTER TABLE ==============
async function alterTable(pool) {
  console.log('🔧 Phase 1: ALTER TABLE daily_reports...\n');
  const cols = [
    ['project', 'varchar(255) DEFAULT NULL'],
    ['area', 'varchar(255) DEFAULT NULL'],
    ['today_work_type', 'varchar(50) DEFAULT NULL'],
    ['tomorrow_work_type', 'varchar(50) DEFAULT NULL'],
    ['work_content', 'varchar(500) DEFAULT NULL'],
    ['workers', 'varchar(255) DEFAULT NULL'],
    ['machine_model', 'varchar(100) DEFAULT NULL'],
    ['worker_count', 'int(11) DEFAULT 0'],
    ['required_qty', 'int(11) DEFAULT 0'],
    ['completed_qty', 'decimal(10,2) DEFAULT 0'],
    ['progress_percent', 'varchar(20) DEFAULT NULL'],
    ['remark', 'text DEFAULT NULL'],
    ['entry_date', 'date DEFAULT NULL'],
    ['initial_biz_trip_date', 'date DEFAULT NULL'],
    ['related_party', 'varchar(255) DEFAULT NULL'],
    ['personal_biz_trip_days', 'int(11) DEFAULT 0'],
    ['biz_trip_days', 'int(11) DEFAULT 0'],
    ['submitter_name', 'varchar(100) DEFAULT NULL'],
  ];

  for (const [col, def] of cols) {
    try {
      await pool.execute(`ALTER TABLE daily_reports ADD COLUMN \`${col}\` ${def}`);
      console.log(`  ✅ 添加列: ${col}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`  ⏭️  跳过(已存在): ${col}`);
      } else {
        console.log(`  ❌ 失败: ${col} - ${e.message}`);
        throw e;
      }
    }
  }
  console.log('\n✅ ALTER 完成\n');
}

// ============== Phase 2: Parse CSV ==============
function parseCSV(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  // Remove BOM
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

  // Parse CSV properly handling quoted fields with newlines
  const allRecords = [];
  let currentField = '';
  let inQuotes = false;
  let currentRecord = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const nextCh = content[i + 1];

    if (inQuotes) {
      if (ch === '"' && nextCh === '"') {
        currentField += '"';
        i++; // skip next quote
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRecord.push(currentField.trim());
        currentField = '';
      } else if (ch === '\n' || (ch === '\r' && nextCh === '\n')) {
        if (ch === '\r') i++; // skip \n of \r\n
        currentRecord.push(currentField.trim());
        if (currentRecord.some(f => f !== '')) {
          allRecords.push(currentRecord);
        }
        currentRecord = [];
        currentField = '';
      } else if (ch === '\r') {
        currentRecord.push(currentField.trim());
        if (currentRecord.some(f => f !== '')) {
          allRecords.push(currentRecord);
        }
        currentRecord = [];
        currentField = '';
      } else {
        currentField += ch;
      }
    }
  }
  // Last field
  currentRecord.push(currentField.trim());
  if (currentRecord.some(f => f !== '')) {
    allRecords.push(currentRecord);
  }

  if (allRecords.length < 2) {
    console.error('CSV 数据不足');
    process.exit(1);
  }

  const header = allRecords[0];
  console.log(`📄 CSV 列: ${header.length} | 数据行: ${allRecords.length - 1}\n`);

  const records = [];
  let skipped = 0;

  for (let i = 1; i < allRecords.length; i++) {
    const fields = allRecords[i];

    const date = cleanDate(fields[0]);       // 日报时间
    if (!date) { skipped++; continue; }

    const submitter = cleanStr(fields[1]);    // 填写人
    const entryDate = cleanDate(fields[2]);   // 入场时间
    const bizTripStart = cleanDate(fields[3]);// 初始出差时间
    const project = cleanStr(fields[4]);      // 项目名称
    const area = cleanStr(fields[5]);         // 项目所在区域
    const relatedParty = cleanStr(fields[6]); // 相关方单位

    // Combine workers
    const w1 = cleanStr(fields[7]);
    const w2 = cleanStr(fields[8]);
    const workers = w2 ? `${w1}、${w2}` : w1;

    const machineModel = cleanStr(fields[9]); // 机型
    const workerCount = cleanInt(fields[10]); // 人数
    const workContent = cleanStr(fields[11]); // 从事工作内容
    const requiredQty = cleanDecimal(fields[12]); // 需要完成数量
    const completedQty = cleanDecimal(fields[13]);// 累计完成数量
    const progress = cleanStr(fields[14]);    // 当前进度 (#DIV/0! → null)
    const todayWork = cleanStr(fields[15]);   // 当日工作小结
    const tomorrowPlan = cleanStr(fields[16]);// 明天工作内容
    const todayType = cleanStr(fields[17]);   // 今日工作类型
    const tomorrowType = cleanStr(fields[18]);// 明日工作类型
    const remark = cleanStr(fields[19]);      // 备注
    const bizTripDays = cleanInt(fields[20]); // 项目出差天数
    const personalDays = cleanInt(fields[21]);// 个人累计出差
    const refAccount = cleanStr(fields[22]);  // 引用账号(部门人员名单)

    // Determine submitter name
    const submitterName = submitter || refAccount || w1 || '未知';

    records.push({
      report_date: date,
      submitter_name: submitterName,
      entry_date: entryDate,
      initial_biz_trip_date: bizTripStart,
      project,
      area,
      related_party: relatedParty,
      workers,
      machine_model: machineModel,
      worker_count: workerCount,
      work_content: workContent,
      required_qty: requiredQty,
      completed_qty: completedQty,
      progress_percent: progress,
      content: todayWork,
      today_work: todayWork,
      tomorrow_plan: tomorrowPlan,
      today_work_type: todayType,
      tomorrow_work_type: tomorrowType,
      remark,
      biz_trip_days: bizTripDays,
      personal_biz_trip_days: personalDays,
      status: 'submitted',
      submitted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
      updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
    });
  }

  console.log(`✅ 解析完成: ${records.length} 条有效记录 (跳过 ${skipped} 行)\n`);
  return records;
}

// ============== Phase 3: Batch INSERT ==============
async function batchInsert(pool, records) {
  console.log('💾 Phase 3: 批量插入数据...\n');

  const sql = `INSERT INTO daily_reports (
    report_date, submitter_name, entry_date, initial_biz_trip_date,
    project, area, related_party, workers, machine_model, worker_count,
    work_content, required_qty, completed_qty, progress_percent,
    content, today_work, tomorrow_plan, today_work_type, tomorrow_work_type,
    remark, biz_trip_days, personal_biz_trip_days,
    status, submitted_at, created_at, updated_at
  ) VALUES ?`;

  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const values = batch.map(r => [
      r.report_date,
      r.submitter_name,
      r.entry_date,
      r.initial_biz_trip_date,
      r.project,
      r.area,
      r.related_party,
      r.workers,
      r.machine_model,
      r.worker_count,
      r.work_content,
      r.required_qty,
      r.completed_qty,
      r.progress_percent,
      r.content,
      r.today_work,
      r.tomorrow_plan,
      r.today_work_type,
      r.tomorrow_work_type,
      r.remark,
      r.biz_trip_days,
      r.personal_biz_trip_days,
      r.status,
      r.submitted_at,
      r.created_at,
      r.updated_at
    ]);

    try {
      await pool.query(sql, [values]);
      inserted += batch.length;
      process.stdout.write(`\r  进度: ${inserted}/${records.length}`);
    } catch (e) {
      console.error(`\n  ❌ 批次 ${i}-${i+batchSize} 插入失败: ${e.message}`);
      throw e;
    }
  }
  console.log(`\n\n✅ 插入完成: ${inserted} 条记录\n`);
}

// ============== Helpers ==============
function cleanStr(val) {
  return (val || '').replace(/^"|"$/g, '').trim() || null;
}

function cleanDate(val) {
  const v = cleanStr(val);
  if (!v) return null;
  // Handle 2025/01/05 format
  if (v.includes('/')) {
    const parts = v.split('/');
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    }
  }
  return v;
}

function cleanInt(val) {
  const v = cleanStr(val);
  if (!v) return 0;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

function cleanDecimal(val) {
  const v = cleanStr(val);
  if (!v || v === '#DIV/0!' || v === '#####') return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ============== Main ==============
(async () => {
  console.log('🚀 公出日志 CSV → MySQL 导入工具\n');
  console.log(`📂 文件: ${csvPath}\n`);

  const pool = mysql.createPool({
    host: process.env.OA_DB_HOST,
    user: process.env.OA_DB_USER,
    password: process.env.OA_DB_PASSWORD,
    database: process.env.OA_DB_NAME,
    connectTimeout: 30000,
    waitForConnections: true,
    connectionLimit: 5
  });

  try {
    // Phase 1
    await alterTable(pool);

    // Phase 2
    const records = parseCSV(csvPath);

    // Phase 3
    await batchInsert(pool, records);

    console.log('🎉 全部完成!');
  } catch (e) {
    console.error('💥 失败:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
