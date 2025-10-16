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
      BOT_TOKEN: '8312811183:AAEIHiM-KbdLNylg_tsqUPfn2h41yL7DH60',
      TELEGRAM_BOT_TOKEN: 'stub_token_for_dev',
      ADMIN_BOT_TOKEN: 'stub_admin_token_for_dev',
      TG_API_ID: '24120142',
      TG_API_HASH: '5792c2ada7d1f4d1d3f91938a5caa7a7',
      SESSION_FILE: '/root/tgparser/.session.txt'
    },
    env_production: {
      NODE_ENV: 'production',
      BOT_TOKEN: '8312811183:AAEIHiM-KbdLNylg_tsqUPfn2h41yL7DH60',
      TELEGRAM_BOT_TOKEN: 'stub_token_for_dev',
      ADMIN_BOT_TOKEN: 'stub_admin_token_for_dev',
      TG_API_ID: '24120142',
      TG_API_HASH: '5792c2ada7d1f4d1d3f91938a5caa7a7',
      SESSION_FILE: '/root/tgparser/.session.txt'
    }
  }]
};


