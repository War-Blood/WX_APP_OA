'use strict';

/**
 * 数据迁移脚本：将 daily_reports.workers 文本字段迁移到 daily_report_workers 关联表
 *
 * 背景：
 *   旧版 daily_reports.workers 字段存储的是 "张三、李四" 这样的人名字符串。
 *   v2.0 升级后作业人员改用 daily_report_workers 关联表，本脚本负责将历史数据迁移过去。
 *
 * 用法: node scripts/migrate-workers-to-userid.js [--dry-run]
 *   不加参数 → 执行迁移
 *   --dry-run → 仅预览，不实际写入
 *
 * 依赖: 需 .env 文件配置 OA_DB_* 环境变量
 */

const path = require('path');

// 确保从 backend/ 目录加载 .env
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mysql = require('mysql2/promise');
const config = require('../src/common/config/env');

// 解析人名列表（支持: 顿号 逗号 空格 换行 多个连续空格）
function parseWorkers(workersStr) {
  if (!workersStr || typeof workersStr !== 'string') return [];
  return workersStr
    .split(/[、,，\n\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2); // 过滤单字/空串（中文姓名至少2字）
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  // 直连数据库
  const pool = mysql.createPool({
    host: config.oaDb.host,
    port: config.oaDb.port,
    user: config.oaDb.user,
    password: config.oaDb.password,
    database: config.oaDb.name,
    waitForConnections: true,
    connectionLimit: 2,
    charset: 'utf8mb4',
    timezone: '+08:00',
  });

  console.log('='.repeat(60));
  console.log('数据迁移: daily_reports.workers → daily_report_workers');
  console.log(`模式: ${dryRun ? 'DRY RUN (仅预览)' : '执行迁移'}`);
  console.log(`数据库: ${config.oaDb.host}/${config.oaDb.name}`);
  console.log('='.repeat(60));

  try {
    // 1. 查所有有 workers 文本的日报
    const [reports] = await pool.query(
      "SELECT id, workers, user_id FROM daily_reports WHERE workers IS NOT NULL AND workers != '' ORDER BY id"
    );

    console.log(`\n共找到 ${reports.length} 条需要迁移的日报记录`);

    if (reports.length === 0) {
      console.log('没有需要迁移的数据，退出。');
      return;
    }

    let migrated = 0;
    let skipped = 0;
    const unmatchedNames = new Set(); // 未能匹配到用户的名字（去重）

    for (const report of reports) {
      const names = parseWorkers(report.workers);
      if (names.length === 0) continue;

      for (const name of names) {
        // 在 users 表模糊匹配
        const [users] = await pool.query(
          'SELECT id FROM users WHERE user_name LIKE ? AND deleted_at IS NULL LIMIT 1',
          [`%${name}%`]
        );

        if (users.length === 0) {
          unmatchedNames.add(name);
          console.log(`[未匹配] 日报 #${report.id} 中的 "${name}" 在 users 表中找不到`);
          skipped++;
          continue;
        }

        const workerUid = users[0].id;

        if (!dryRun) {
          // INSERT IGNORE 防重复
          try {
            await pool.execute(
              'INSERT IGNORE INTO daily_report_workers (report_id, worker_uid, created_at) VALUES (?, ?, NOW())',
              [report.id, workerUid]
            );
          } catch (err) {
            console.log(`[错误] 日报 #${report.id} worker_uid=${workerUid}: ${err.message}`);
            skipped++;
            continue;
          }
        }

        migrated++;
        if (migrated % 50 === 0) {
          console.log(`进度: 已处理 ${migrated} 条关联...`);
        }
      }
    }

    // 打印汇总
    console.log('\n' + '='.repeat(60));
    console.log('迁移结果汇总:');
    console.log(`  成功迁移: ${migrated} 条关联`);
    console.log(`  跳过(未匹配): ${skipped} 条`);
    console.log(`  未匹配人名: ${unmatchedNames.size} 个`);
    if (unmatchedNames.size > 0) {
      console.log(`  未匹配列表: ${Array.from(unmatchedNames).join(', ')}`);
    }
    console.log('='.repeat(60));

    if (dryRun) {
      console.log('\n[DRY RUN] 以上为预览，未实际写入数据。去掉 --dry-run 参数执行真实迁移。');
    }
  } catch (err) {
    console.error('迁移失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
