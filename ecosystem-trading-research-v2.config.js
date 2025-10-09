module.exports = {
  apps: [{
    name: 'trading-strategies-research-v2',
    script: 'trading-strategies-research-v2.js',
    cwd: '/home/user1/ContentBot',
    instances: 1,
    autorestart: false,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    log_file: './logs/trading-research-v2.log',
    out_file: './logs/trading-research-v2-out.log',
    error_file: './logs/trading-research-v2-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
