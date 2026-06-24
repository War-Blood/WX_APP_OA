'use strict';

/**
 * 重置管理员密码脚本
 * 用法: node scripts/reset-admin-password.js <username> <newPassword>
 * 示例: node scripts/reset-admin-password.js admin MyNewPass123
 */

const bcrypt = require('bcryptjs');
const path = require('path');

// 加载数据库配置
const db = require('../src/common/config/database');

const SALT_ROUNDS = 10;

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('用法: node scripts/reset-admin-password.js <username> <newPassword>');
    console.log('示例: node scripts/reset-admin-password.js admin MyNewPass123');
    process.exit(1);
  }

  const [username, newPassword] = args;

  if (newPassword.length < 6) {
    console.error('密码至少6位');
    process.exit(1);
  }

  try {
    // 查找用户
    const rows = await db.query(
      'SELECT id, user_name, role FROM users WHERE user_name = ? AND deleted_at IS NULL',
      [username]
    );

    if (rows.length === 0) {
      console.error(`用户 "${username}" 不存在`);
      process.exit(1);
    }

    const user = rows[0];
    if (!['admin', 'superadmin'].includes(user.role)) {
      console.error(`用户 "${username}" 不是管理员（当前角色: ${user.role}）`);
      process.exit(1);
    }

    // 生成新密码哈希
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    // 更新密码
    await db.execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hash, user.id]
    );

    console.log(`✅ 管理员 "${username}" 密码已重置`);
    console.log(`   用户ID: ${user.id}`);
    console.log(`   新密码: ${newPassword}`);
    console.log(`   ⚠️  请登录后立即修改密码`);
  } catch (err) {
    console.error('重置失败:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
