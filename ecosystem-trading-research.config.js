module.exports = {
  apps: [{
    name: 'trading-strategies-research',
    script: 'trading-strategies-research.js',
    cwd: '/home/user1/ContentBot',
    instances: 1,
    autorestart: false,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    log_file: './logs/trading-research.log',
    out_file: './logs/trading-research-out.log',
    error_file: './logs/trading-research-error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
