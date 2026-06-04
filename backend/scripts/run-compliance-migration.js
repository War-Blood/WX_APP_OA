const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 数据库配置
const dbConfig = {
  host: '111.229.107.123',
  port: 3306,
  user: 'daily_report_user',
  password: 'DailyReport@2024',
  database: 'wx_app_oa',
  multipleStatements: true // 允许执行多条SQL语句
};

async function executeMigration(sqlFilePath) {
  let connection;
  try {
    console.log(`\n========================================`);
    console.log(`开始执行迁移脚本: ${path.basename(sqlFilePath)}`);
    console.log(`========================================\n`);

    // 读取SQL文件
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ 数据库连接成功');

    // 执行SQL
    console.log('正在执行SQL脚本...');
    const [results] = await connection.query(sqlContent);
    console.log('✓ SQL脚本执行成功');

    // 显示结果
    if (results && results.length > 0) {
      console.log('\n执行结果:');
      results.forEach((result, index) => {
        if (result && typeof result === 'object') {
          console.log(`  结果 ${index + 1}:`, JSON.stringify(result, null, 2));
        }
      });
    }

    console.log(`\n✓ 迁移脚本执行完成: ${path.basename(sqlFilePath)}\n`);
    return true;

  } catch (error) {
    console.error(`\n✗ 迁移脚本执行失败: ${path.basename(sqlFilePath)}`);
    console.error('错误信息:', error.message);
    if (error.sql) {
      console.error('SQL语句:', error.sql);
    }
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭\n');
    }
  }
}

async function verifyTables() {
  let connection;
  try {
    console.log('\n========================================');
    console.log('开始验证表结构');
    console.log('========================================\n');

    connection = await mysql.createConnection(dbConfig);

    // 检查新表是否存在
    const tablesToCheck = ['biz_trip_status', 'report_compliance', 'user_compliance_stats'];
    
    for (const tableName of tablesToCheck) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = 'wx_app_oa' AND table_name = ?`,
        [tableName]
      );
      
      if (rows[0].count > 0) {
        console.log(`✓ 表 ${tableName} 创建成功`);
        
        // 显示表结构
        const [columns] = await connection.query(`DESCRIBE ${tableName}`);
        console.log(`  字段数量: ${columns.length}`);
        console.log(`  字段列表: ${columns.map(col => col.Field).join(', ')}`);
      } else {
        console.log(`✗ 表 ${tableName} 不存在`);
      }
    }

    // 检查daily_reports表的修改
    console.log('\n检查 daily_reports 表修改:');
    const [columns] = await connection.query(`DESCRIBE daily_reports`);
    const newFields = ['timeliness', 'compliance_id'];
    
    newFields.forEach(field => {
      const exists = columns.some(col => col.Field === field);
      if (exists) {
        const colInfo = columns.find(col => col.Field === field);
        console.log(`✓ 字段 ${field} 添加成功 (${colInfo.Type})`);
      } else {
        console.log(`✗ 字段 ${field} 不存在`);
      }
    });

    // 检查索引
    console.log('\n检查索引:');
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME, COLUMN_NAME 
      FROM information_schema.statistics 
      WHERE table_schema = 'wx_app_oa' 
        AND table_name IN ('biz_trip_status', 'report_compliance', 'user_compliance_stats', 'daily_reports')
      ORDER BY table_name, INDEX_NAME
    `);
    
    const indexMap = {};
    indexes.forEach(idx => {
      if (!indexMap[idx.INDEX_NAME]) {
        indexMap[idx.INDEX_NAME] = [];
      }
      indexMap[idx.INDEX_NAME].push(idx.COLUMN_NAME);
    });
    
    Object.entries(indexMap).forEach(([indexName, columns]) => {
      console.log(`  ✓ ${indexName}: (${columns.join(', ')})`);
    });

    console.log('\n✓ 表结构验证完成\n');

  } catch (error) {
    console.error('✗ 验证过程出错:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function main() {
  try {
    // 执行建表脚本
    const createTablesScript = path.join(__dirname, 'migration_create_compliance_tables.sql');
    await executeMigration(createTablesScript);

    // 执行修改表脚本
    const alterTableScript = path.join(__dirname, 'migration_alter_daily_reports_compliance.sql');
    await executeMigration(alterTableScript);

    // 验证表结构
    await verifyTables();

    console.log('\n========================================');
    console.log('✓ 所有迁移任务执行成功!');
    console.log('========================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ 迁移过程中出现错误');
    console.error('========================================\n');
    process.exit(1);
  }
}

main();
