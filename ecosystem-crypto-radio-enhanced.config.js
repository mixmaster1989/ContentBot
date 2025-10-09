module.exports = {
  apps: [{
    name: 'crypto-radio-dj-enhanced',
    script: 'crypto-radio-scheduler-enhanced.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/crypto-radio-enhanced-error.log',
    out_file: './logs/crypto-radio-enhanced-out.log',
    log_file: './logs/crypto-radio-enhanced-combined.log',
    time: true
  }]
};
