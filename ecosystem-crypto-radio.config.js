module.exports = {
  apps: [{
    name: 'crypto-radio-dj',
    script: 'crypto-radio-scheduler.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/crypto-radio-error.log',
    out_file: './logs/crypto-radio-out.log',
    log_file: './logs/crypto-radio-combined.log',
    time: true
  }]
};
