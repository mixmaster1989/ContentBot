module.exports = {
  apps: [{
    name: 'antilopa-search-monitor',
    script: './antilopa-search-monitor.js',
    cwd: '/home/user1/ContentBot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/antilopa-error.log',
    out_file: './logs/antilopa-out.log',
    log_file: './logs/antilopa-combined.log',
    time: true,
    env: {
      NODE_ENV: 'production'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};


