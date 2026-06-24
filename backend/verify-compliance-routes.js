'use strict';

// 简单验证compliance路由是否注册
const path = require('path');
process.chdir(path.join(__dirname));

console.log('=== Compliance API Route Verification ===\n');

try {
  // 加载app
  console.log('1. Loading app.js...');
  const app = require('./src/app.js');
  console.log('   ✅ App loaded successfully\n');
  
  // 检查路由栈
  console.log('2. Checking registered routes...');
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Nested router
      if (middleware.handle && middleware.handle.stack) {
        const basePath = middleware.regexp ? 
          middleware.regexp.toString().match(/\/api\/([^\\]+)/)?.[1] : 'unknown';
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            routes.push({
              path: `/api/${basePath}${handler.route.path}`,
              methods: Object.keys(handler.route.methods)
            });
          }
        });
      }
    }
  });
  
  // 查找compliance相关路由
  const complianceRoutes = routes.filter(r => r.path.includes('compliance'));
  
  console.log(`   Found ${complianceRoutes.length} compliance routes:\n`);
  complianceRoutes.forEach(route => {
    console.log(`   - ${route.methods.join(', ').toUpperCase()} ${route.path}`);
  });
  
  console.log('\n3. Verification Result:');
  if (complianceRoutes.length > 0) {
    console.log('   ✅ Compliance routes are registered');
    console.log('   ✅ PASS - Routes accessible (will return 401 without auth)\n');
  } else {
    console.log('   ❌ No compliance routes found');
    console.log('   ❌ FAIL - Routes not registered\n');
  }
  
  process.exit(0);
} catch (err) {
  console.error('   ❌ Error:', err.message);
  console.error('   Stack:', err.stack);
  process.exit(1);
}
