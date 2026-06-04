const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.OA_DB_HOST || '111.229.107.123',
    port: 3306,
    user: process.env.OA_DB_USER || 'daily_report_user',
    password: process.env.OA_DB_PASSWORD || 'DailyReport@2024',
    database: 'wx_app_oa'
  });

  console.log('=== 数据库验证开始 ===\n');
  
  let allPassed = true;

  try {
    // 1. 检查新表是否存在
    console.log('1. 检查新表创建情况:');
    const tables = ['biz_trip_status', 'report_compliance', 'user_compliance_stats'];
    for (const table of tables) {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = 'wx_app_oa' AND table_name = ?`,
        [table]
      );
      
      if (rows[0].count > 0) {
        console.log(`   ✅ 表 ${table} 存在`);
      } else {
        console.log(`   ❌ 表 ${table} 不存在`);
        allPassed = false;
      }
    }

    // 2. 检查daily_reports表的修改
    console.log('\n2. 检查daily_reports表新增字段:');
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = 'wx_app_oa' AND TABLE_NAME = 'daily_reports' 
       AND COLUMN_NAME IN ('timeliness', 'compliance_id')`
    );
    
    if (columns.length === 2) {
      columns.forEach(col => {
        console.log(`   ✅ ${col.COLUMN_NAME} (${col.COLUMN_TYPE})`);
      });
    } else {
      console.log(`   ❌ 只找到 ${columns.length}/2 个字段`);
      columns.forEach(col => {
        console.log(`      - ${col.COLUMN_NAME}`);
      });
      allPassed = false;
    }

    // 3. 检查索引
    console.log('\n3. 检查biz_trip_status表索引:');
    const [bizTripIndexes] = await connection.execute(
      `SELECT INDEX_NAME, COLUMN_NAME 
       FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = 'wx_app_oa' AND TABLE_NAME = 'biz_trip_status'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`
    );
    
    const bizTripIndexGroups = {};
    bizTripIndexes.forEach(idx => {
      if (!bizTripIndexGroups[idx.INDEX_NAME]) {
        bizTripIndexGroups[idx.INDEX_NAME] = [];
      }
      bizTripIndexGroups[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    
    Object.keys(bizTripIndexGroups).forEach(indexName => {
      const cols = bizTripIndexGroups[indexName].join(', ');
      console.log(`   ✅ ${indexName} (${cols})`);
    });

    console.log('\n4. 检查report_compliance表索引:');
    const [complianceIndexes] = await connection.execute(
      `SELECT INDEX_NAME, COLUMN_NAME 
       FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = 'wx_app_oa' AND TABLE_NAME = 'report_compliance'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`
    );
    
    const complianceIndexGroups = {};
    complianceIndexes.forEach(idx => {
      if (!complianceIndexGroups[idx.INDEX_NAME]) {
        complianceIndexGroups[idx.INDEX_NAME] = [];
      }
      complianceIndexGroups[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    
    Object.keys(complianceIndexGroups).forEach(indexName => {
      const cols = complianceIndexGroups[indexName].join(', ');
      console.log(`   ✅ ${indexName} (${cols})`);
    });

    console.log('\n5. 检查user_compliance_stats表索引:');
    const [statsIndexes] = await connection.execute(
      `SELECT INDEX_NAME, COLUMN_NAME 
       FROM information_schema.STATISTICS 
       WHERE TABLE_SCHEMA = 'wx_app_oa' AND TABLE_NAME = 'user_compliance_stats'
       ORDER BY INDEX_NAME, SEQ_IN_INDEX`
    );
    
    const statsIndexGroups = {};
    statsIndexes.forEach(idx => {
      if (!statsIndexGroups[idx.INDEX_NAME]) {
        statsIndexGroups[idx.INDEX_NAME] = [];
      }
      statsIndexGroups[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    
    Object.keys(statsIndexGroups).forEach(indexName => {
      const cols = statsIndexGroups[indexName].join(', ');
      console.log(`   ✅ ${indexName} (${cols})`);
    });

    // 6. 检查表结构详情
    console.log('\n6. 验证表结构详情:');
    
    // biz_trip_status字段数
    const [bizTripCols] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = 'wx_app_oa' AND TABLE_NAME = 'biz_trip_status'`
    );
    console.log(`   biz_trip_status: ${bizTripCols[0].count} 个字段 (预期: 9)`);
    
    // report_compliance字段数
    const [complianceCols] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = 'wx_app_oa' AND TABLE_NAME = 'report_compliance'`
    );
    console.log(`   report_compliance: ${complianceCols[0].count} 个字段 (预期: 16)`);
    
    // user_compliance_stats字段数
    const [statsCols] = await connection.execute(
      `SELECT COUNT(*) as count FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = 'wx_app_oa' AND TABLE_NAME = 'user_compliance_stats'`
    );
    console.log(`   user_compliance_stats: ${statsCols[0].count} 个字段 (预期: 10)`);

    console.log('\n=== 数据库验证完成 ===');
    
    if (allPassed) {
      console.log('✅ 所有验证通过!');
    } else {
      console.log('❌ 部分验证失败,请检查上述输出');
    }
    
    return allPassed;
  } catch (err) {
    console.error('❌ 数据库验证出错:', err.message);
    console.error(err.stack);
    return false;
  } finally {
    await connection.end();
  }
}

// 执行验证
verifyDatabase().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('未捕获的错误:', err);
  process.exit(1);
});
