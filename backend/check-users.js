'use strict';

// 检查数据库中的用户角色
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const db = require('./src/common/config/database');

async function checkUsers() {
  try {
    console.log('查询users表中的所有用户...\n');
    
    const users = await db.query('SELECT id, account, role, status FROM users');
    
    console.log('用户列表:');
    console.table(users);
    
    console.log('\n管理员账号信息:');
    const adminUser = users.find(u => u.account === 'admin');
    if (adminUser) {
      console.log('- ID:', adminUser.id);
      console.log('- Account:', adminUser.account);
      console.log('- Role:', adminUser.role);
      console.log('- Status:', adminUser.status);
    } else {
      console.log('未找到account为"admin"的用户');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  }
}

checkUsers();
