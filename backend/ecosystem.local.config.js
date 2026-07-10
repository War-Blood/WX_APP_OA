// 本地部署 PM2 配置 — Windows 开发机
module.exports = {
  apps: [{
    name: 'wx-app-oa-api-local',
    script: 'src/app.js',
    cwd: 'Y:/AI/WX-APP-OA/backend',
    interpreter: 'C:/Users/WarBlood/.workbuddy/binaries/node/versions/22.22.2/node.exe',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '256M',
    error_file: 'Y:/AI/WX-APP-OA/backend/logs/pm2-local-error.log',
    out_file: 'Y:/AI/WX-APP-OA/backend/logs/pm2-local-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 5000,
  }]
};
