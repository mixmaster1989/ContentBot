module.exports = {
  apps: [{
    name: 'contentbot',
    script: 'npm',
    args: 'start',
    cwd: '/root/contentbot',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: './logs/contentbot-error.log',
    out_file: './logs/contentbot-out.log',
    log_file: './logs/contentbot-combined.log',
    time: true,
    env: {
      NODE_ENV: 'production',
      BOT_TOKEN: 'your_bot_token_here',
      TELEGRAM_BOT_TOKEN: 'stub_token_for_dev',
      ADMIN_BOT_TOKEN: 'stub_admin_token_for_dev',
      TG_API_ID: 'your_api_id_here',
      TG_API_HASH: 'your_api_hash_here',
      SESSION_FILE: '/root/tgparser/.session.txt'
    },
    env_production: {
      NODE_ENV: 'production',
      BOT_TOKEN: 'your_bot_token_here',
      TELEGRAM_BOT_TOKEN: 'stub_token_for_dev',
      ADMIN_BOT_TOKEN: 'stub_admin_token_for_dev',
      TG_API_ID: 'your_api_id_here',
      TG_API_HASH: 'your_api_hash_here',
      SESSION_FILE: '/root/tgparser/.session.txt'
    }
  }]
};


