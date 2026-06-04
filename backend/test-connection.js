'use strict';

// 简单的连接测试脚本
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development';
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

console.log('环境变量检查:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- OA_DB_HOST:', process.env.OA_DB_HOST);
console.log('- REDIS_HOST:', process.env.REDIS_HOST);
console.log('- WX_APPID:', process.env.WX_APPID ? '已设置' : '未设置');

console.log('\n尝试加载app模块...');

const startTime = Date.now();

try {
  const app = require('./src/app');
  const loadTime = Date.now() - startTime;
  console.log(`✅ app模块加载成功 (耗时: ${loadTime}ms)`);
  
  console.log('\n尝试发送测试请求...');
  const request = require('supertest');
  
  const testTimeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('测试请求超时(5秒)')), 5000)
  );
  
  const testRequest = request(app).get('/api/compliance/my-compliance');
  
  Promise.race([testRequest, testTimeout])
    .then(res => {
      console.log(`✅ 测试请求完成`);
      console.log(`   状态码: ${res.status}`);
      console.log(`   响应体:`, JSON.stringify(res.body).substring(0, 200));
      process.exit(0);
    })
    .catch(err => {
      console.log(`❌ 测试请求失败:`, err.message);
      process.exit(1);
    });
    
} catch (err) {
  const loadTime = Date.now() - startTime;
  console.log(`❌ app模块加载失败 (耗时: ${loadTime}ms)`);
  console.error('错误:', err.message);
  console.error(err.stack);
  process.exit(1);
}
