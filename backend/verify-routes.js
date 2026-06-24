const http = require('http');

// 配置
const BASE_URL = 'http://localhost:3102';

/**
 * 发送HTTP请求(不带token,预期返回401)
 */
function request(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

/**
 * 测试接口路由是否注册
 */
async function runTests() {
  console.log('\n========== 公出日志合规管理 API 路由验证 ==========\n');

  const tests = [
    { method: 'GET', path: '/api/compliance/my-compliance', desc: '员工接口-我的合规记录' },
    { method: 'GET', path: '/api/compliance/biz-trip/check-status', desc: '员工接口-检查出差状态' },
    { method: 'GET', path: '/api/compliance/missing-reports', desc: '管理员接口-缺失报告列表' },
    { method: 'GET', path: '/api/compliance/stats/dashboard', desc: '管理员接口-合规统计看板' },
    { method: 'GET', path: '/api/compliance/biz-trip/list', desc: '管理员接口-出差列表' }
  ];

  for (const test of tests) {
    console.log(`[测试] ${test.method} ${test.path}`);
    console.log(`描述: ${test.desc}`);
    
    try {
      const result = await request(test.method, test.path);
      
      // 如果返回200且code为401/403,说明路由已注册但需要认证(符合预期)
      // 如果返回404,说明路由未注册
      if (result.statusCode === 200 && (result.data.code === 401 || result.data.code === 403)) {
        console.log(`✓ 路由已注册 (需要认证)`);
        console.log(`响应: ${JSON.stringify(result.data)}\n`);
      } else if (result.statusCode === 404) {
        console.log(`✗ 路由未注册 (返回404)\n`);
      } else {
        console.log(`? 意外状态码: ${result.statusCode}`);
        console.log(`响应: ${JSON.stringify(result.data)}\n`);
      }
    } catch (err) {
      console.log(`✗ 请求失败: ${err.message}\n`);
    }
  }

  console.log('========== 验证完成 ==========\n');
}

runTests().catch(console.error);
