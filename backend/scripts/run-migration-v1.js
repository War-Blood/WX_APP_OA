'use strict';

/**
 * V1 RBAC 迁移执行脚本
 * 执行 migration_v1_rbac.sql，处理重复索引错误
 *
 * 使用: node backend/scripts/run-migration-v1.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.OA_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.OA_DB_PORT || '3306'),
  user: process.env.OA_DB_USER || 'daily_report_user',
  password: process.env.OA_DB_PASSWORD || '',
  database: process.env.OA_DB_NAME || 'wx_app_oa',
  multipleStatements: true,
};

const SQL_FILE = path.join(__dirname, '..', '..', 'sql', 'migration_v1_rbac.sql');

async function run() {
  let connection;
  try {
    console.log('========================================');
    console.log('V1 RBAC 迁移: roles/permissions/role_permissions');
    console.log('========================================\n');

    const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');

    connection = await mysql.createConnection(dbConfig);
    console.log('已连接到 wx_app_oa\n');

    // 分割 SQL 语句，逐条执行以处理重复索引错误
    // 不使用 simple split(';')，因为字符串中可能包含分号
    const statements = splitSQL(sqlContent);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;

      try {
        const [result] = await connection.query(stmt);
        // 如果是验证查询，显示结果
        if (stmt.toUpperCase().includes('SELECT') && stmt.toUpperCase().includes('COUNT')) {
          if (Array.isArray(result) && result.length > 0) {
            const row = result[0];
            console.log(`  ${Object.entries(row).map(([k, v]) => `${k}: ${v}`).join('  ')}`);
          }
        }
        successCount++;
      } catch (err) {
        // 重复索引错误(Duplicate key name)可安全忽略
        if (err.code === 'ER_DUP_KEYNAME') {
          console.log(`  [跳过] 索引已存在: ${err.sqlMessage}`);
          skipCount++;
        } else if (err.code === 'ER_DUP_ENTRY') {
          console.log(`  [跳过] 数据已存在 (IGNORE)`);
          skipCount++;
        } else {
          console.error(`  [错误] ${err.message}`);
          console.error(`  SQL: ${stmt.substring(0, 100)}...`);
          errorCount++;
        }
      }
    }

    console.log('\n========================================');
    console.log(`迁移完成: ${successCount} 成功  ${skipCount} 跳过  ${errorCount} 失败`);
    console.log('========================================');
  } catch (err) {
    console.error('迁移失败:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

/**
 * 分割 SQL 语句（处理字符串内分号、多行注释）
 */
function splitSQL(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];

    // 跟踪字符串边界
    if (!inString && (ch === "'" || ch === '"' || ch === '`')) {
      inString = true;
      stringChar = ch;
    } else if (inString && ch === stringChar) {
      // 检查转义
      if (sql[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }
    }

    // 仅当不在字符串内时分隔
    if (!inString && ch === ';') {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
    } else {
      current += ch;
    }
  }

  // 最后一段（无分号结尾）
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }

  return statements;
}

run();
