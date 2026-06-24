module.exports = {
  apps: [{
    name: 'wx-app-oa-api',
    script: 'src/app.js',
    cwd: '/var/www/wx-app-oa/backend',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '256M',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 5000,
  }]
};
