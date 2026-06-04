const http = require('http');

// 测试定时任务是否正常工作
async function testScheduler() {
  console.log('=== 测试公出日志合规管理定时任务 ===\n');
  
  // 1. 检查服务是否运行
  console.log('1. 检查后端服务状态...');
  try {
    const response = await makeRequest('GET', '/api/auth/admin/login');
    console.log('   ✓ 服务正在运行\n');
  } catch (err) {
    console.log('   ✗ 服务未启动或无法访问\n');
    return;
  }
  
  // 2. 获取管理员token
  console.log('2. 获取管理员Token...');
  try {
    const loginResult = await makeRequest('POST', '/api/auth/admin/login', {
      account: 'admin',
      password: 'admin123'
    });
    
    if (loginResult.code === 0 && loginResult.data && loginResult.data.token) {
      const token = loginResult.data.token;
      console.log('   ✓ Token获取成功\n');
      
      // 3. 测试提醒任务
      console.log('3. 测试发送提醒任务...');
      try {
        const reminderResult = await makeRequest('GET', '/api/compliance/test/send-reminder?timeSlot=22:00', null, token);
        console.log('   ✓ 提醒任务执行成功');
        console.log('   返回数据:', JSON.stringify(reminderResult, null, 2));
        console.log();
      } catch (err) {
        console.log('   ✗ 提醒任务执行失败:', err.message);
        console.log();
      }
    } else {
      console.log('   ✗ 登录失败:', loginResult.message);
      console.log('   提示: 请检查管理员账号密码是否正确\n');
    }
  } catch (err) {
    console.log('   ✗ 获取Token失败:', err.message);
    console.log('   提示: 可能需要先初始化数据库或创建管理员账号\n');
  }
  
  console.log('=== 测试完成 ===');
}

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3100,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error('解析响应失败'));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

testScheduler().catch(console.error);
