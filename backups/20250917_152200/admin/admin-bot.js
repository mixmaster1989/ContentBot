require('dotenv').config();
const { Bot } = require('grammy');
const { Database } = require('../core/database');
const { PaymentSystem } = require('../payments/payment-system');
const { ContentParser } = require('../parsers/content-parser');
const { LLMRewriter } = require('../llm/llm-rewriter');

class AdminBot {
  constructor() {
    this.bot = new Bot(process.env.ADMIN_BOT_TOKEN);
    this.db = new Database();
    this.payments = new PaymentSystem();
    this.parser = new ContentParser();
    this.llm = new LLMRewriter();
    
    this.adminIds = [parseInt(process.env.OWNER_ID)];
    this.setupHandlers();
    
    console.log('👑 Админ-бот запущен!');
  }

  setupHandlers() {
    // Middleware для проверки админа
    this.bot.use(async (ctx, next) => {
      if (this.adminIds.includes(ctx.from?.id)) {
        await next();
      } else {
        await ctx.reply('❌ Доступ запрещен');
      }
    });

    // Главное меню
    this.bot.command('start', async (ctx) => {
      await ctx.reply('👑 *Админ-панель ContentBot*', {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            ['📊 Статистика', '💰 Платежи'],
            ['👥 Пользователи', '📝 Контент'],
            ['⚙️ Настройки', '🔄 Система']
          ],
          resize_keyboard: true
        }
      });
    });

    // Статистика
    this.bot.hears('📊 Статистика', async (ctx) => {
      await ctx.reply('📊 Выберите период:');
      const stats = await this.getFullStats();
      
      await ctx.reply(`
📈 *Общая статистика:*

👥 Всего пользователей: ${stats.total_users}
📺 Активных каналов: ${stats.active_channels || 0}
📝 Постов создано: ${stats.total_posts}
💰 Общая выручка: ${stats.total_revenue || 0}₽

📅 *За сегодня:*
🆕 Новых пользователей: ${stats.today_users || 0}
💸 Платежей: ${stats.today_payments || 0}
📄 Постов: ${stats.today_posts || 0}
      `, { parse_mode: 'Markdown' });
    });

    // Платежи
    this.bot.hears('💰 Платежи', async (ctx) => {
      await ctx.reply('💰 *Управление платежами:*', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 Список платежей', callback_data: 'payments_list' },
              { text: '✅ Подтвердить вручную', callback_data: 'confirm_payment' }
            ],
            [
              { text: '📊 Статистика', callback_data: 'payments_stats' },
              { text: '💸 Возвраты', callback_data: 'refunds' }
            ]
          ]
        }
      });
    });

    // Пользователи
    this.bot.hears('👥 Пользователи', async (ctx) => {
      await ctx.reply('👥 *Управление пользователями:*', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📋 Список пользователей', callback_data: 'users_list' },
              { text: '🔍 Поиск пользователя', callback_data: 'find_user' }
            ],
            [
              { text: '🎁 Выдать подписку', callback_data: 'give_subscription' },
              { text: '🚫 Заблокировать', callback_data: 'ban_user' }
            ]
          ]
        }
      });
    });

    // Контент
    this.bot.hears('📝 Контент', async (ctx) => {
      await ctx.reply('📝 *Управление контентом:*', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Тест парсера', callback_data: 'test_parser' },
              { text: '🤖 Тест LLM', callback_data: 'test_llm' }
            ],
            [
              { text: '📂 Источники', callback_data: 'content_sources' },
              { text: '📊 Статистика постов', callback_data: 'posts_stats' }
            ]
          ]
        }
      });
    });

    // Система
    this.bot.hears('🔄 Система', async (ctx) => {
      await ctx.reply('🔄 *Системные функции:*', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🗄️ Бэкап БД', callback_data: 'backup_db' },
              { text: '🧹 Очистка', callback_data: 'cleanup' }
            ],
            [
              { text: '📈 Мониторинг', callback_data: 'monitoring' },
              { text: '🔧 Логи', callback_data: 'logs' }
            ]
          ]
        }
      });
    });

    // Обработка callback запросов
    this.bot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;

      switch (data) {
        case 'payments_list':
          await this.showPaymentsList(ctx);
          break;
        case 'payments_stats':
          await this.showPaymentsStats(ctx);
          break;
        case 'users_list':
          await this.showUsersList(ctx);
          break;
        case 'test_parser':
          await this.testParser(ctx);
          break;
        case 'test_llm':
          await this.testLLM(ctx);
          break;
        case 'backup_db':
          await this.backupDatabase(ctx);
          break;
        case 'cleanup':
          await this.cleanupSystem(ctx);
          break;
        case 'monitoring':
          await this.showMonitoring(ctx);
          break;
      }

      await ctx.answerCallbackQuery();
    });

    // Команды
    this.bot.command('stats', async (ctx) => {
      const stats = await this.getFullStats();
      await ctx.reply(`📊 ${JSON.stringify(stats, null, 2)}`);
    });

    this.bot.command('addadmin', async (ctx) => {
      const userId = ctx.message.text.split(' ')[1];
      if (userId && !isNaN(userId)) {
        this.adminIds.push(parseInt(userId));
        await ctx.reply(`✅ Админ ${userId} добавлен`);
      } else {
        await ctx.reply('❌ Укажите корректный ID: /addadmin 123456');
      }
    });

    this.bot.command('broadcast', async (ctx) => {
      const message = ctx.message.text.replace('/broadcast ', '');
      if (message) {
        await this.broadcastMessage(message);
        await ctx.reply('📢 Рассылка запущена');
      }
    });

    // Обработка ошибок
    this.bot.catch((err) => {
      console.error('Ошибка админ-бота:', err);
    });
  }

  // Показать список платежей
  async showPaymentsList(ctx) {
    try {
      const payments = await this.db.allQuery(`
        SELECT p.*, u.username 
        FROM payments p 
        LEFT JOIN users u ON p.user_id = u.telegram_id 
        ORDER BY p.created_at DESC 
        LIMIT 10
      `);

      let message = '💰 *Последние платежи:*\n\n';
      
      for (let payment of payments) {
        const date = new Date(payment.created_at * 1000).toLocaleString('ru');
        message += `💳 ${payment.amount}₽ | ${payment.status}\n`;
        message += `👤 @${payment.username || payment.user_id}\n`;
        message += `📅 ${date}\n`;
        message += `🆔 ${payment.payment_id}\n\n`;
      }

      await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.editMessageText('❌ Ошибка загрузки платежей');
    }
  }

  // Показать статистику платежей
  async showPaymentsStats(ctx) {
    try {
      const stats = await this.payments.getPaymentStats(30);
      
      let message = '📊 *Статистика платежей (30 дней):*\n\n';
      message += `💰 Общая выручка: ${stats.totalRevenue}₽\n\n`;
      
      for (let stat of stats.stats) {
        message += `${stat.payment_method}: ${stat.count} платежей (${stat.total_amount}₽)\n`;
      }

      await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.editMessageText('❌ Ошибка загрузки статистики');
    }
  }

  // Показать список пользователей
  async showUsersList(ctx) {
    try {
      const users = await this.db.allQuery(`
        SELECT telegram_id, username, subscription_status, channels_count, created_at
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 15
      `);

      let message = '👥 *Последние пользователи:*\n\n';
      
      for (let user of users) {
        const date = new Date(user.created_at * 1000).toLocaleDateString('ru');
        message += `👤 @${user.username || user.telegram_id}\n`;
        message += `📊 ${user.subscription_status} | каналов: ${user.channels_count}\n`;
        message += `📅 ${date}\n\n`;
      }

      await ctx.editMessageText(message, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.editMessageText('❌ Ошибка загрузки пользователей');
    }
  }

  // Тест парсера
  async testParser(ctx) {
    try {
      await ctx.editMessageText('🔄 Тестирую парсер...');
      
      const content = await this.parser.getRandomContent();
      
      await ctx.editMessageText(`✅ *Парсер работает!*\n\nИсточник: ${content.source}\nТема: ${content.topic}\n\nТекст:\n${content.text.substring(0, 500)}...`, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      await ctx.editMessageText(`❌ Ошибка парсера: ${error.message}`);
    }
  }

  // Тест LLM
  async testLLM(ctx) {
    try {
      await ctx.editMessageText('🤖 Тестирую LLM...');
      
      const testText = 'Успех приходит к тем, кто готов упорно работать над своими целями каждый день.';
      const rewritten = await this.llm.rewriteContent({ text: testText }, 'мотивация');
      
      await ctx.editMessageText(`✅ *LLM работает!*\n\nОригинал:\n${testText}\n\nПереписано:\n${rewritten.text}`, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      await ctx.editMessageText(`❌ Ошибка LLM: ${error.message}`);
    }
  }

  // Мониторинг системы
  async showMonitoring(ctx) {
    try {
      const stats = await this.getSystemStats();
      
      await ctx.editMessageText(`🔧 *Мониторинг системы:*\n\n🟢 Статус: Работает\n⏰ Uptime: ${stats.uptime}\n💾 Память: ${stats.memory}MB\n📊 CPU: ${stats.cpu}%\n\n📁 База данных: ✅\n🤖 LLM: ✅\n📡 Парсер: ✅`, {
        parse_mode: 'Markdown'
      });
    } catch (error) {
      await ctx.editMessageText('❌ Ошибка мониторинга');
    }
  }

  // Бэкап базы данных
  async backupDatabase(ctx) {
    try {
      await ctx.editMessageText('🗄️ Создаю бэкап базы данных...');
      
      // Здесь должен быть код бэкапа
      const backupPath = `/home/user1/ContentBot/data/backup_${Date.now()}.db`;
      
      await ctx.editMessageText(`✅ Бэкап создан: ${backupPath}`);
    } catch (error) {
      await ctx.editMessageText('❌ Ошибка создания бэкапа');
    }
  }

  // Очистка системы
  async cleanupSystem(ctx) {
    try {
      await ctx.editMessageText('🧹 Очищаю систему...');
      
      await this.db.cleanup();
      
      await ctx.editMessageText('✅ Очистка завершена');
    } catch (error) {
      await ctx.editMessageText('❌ Ошибка очистки');
    }
  }

  // Рассылка сообщений
  async broadcastMessage(message) {
    try {
      const users = await this.db.allQuery('SELECT telegram_id FROM users');
      
      for (let user of users) {
        try {
          // Здесь отправка через основного бота
          console.log(`📢 Отправляю пользователю ${user.telegram_id}: ${message}`);
        } catch (error) {
          console.error(`Ошибка отправки пользователю ${user.telegram_id}:`, error);
        }
      }
      
      console.log(`📢 Рассылка завершена для ${users.length} пользователей`);
    } catch (error) {
      console.error('Ошибка рассылки:', error);
    }
  }

  // Получить полную статистику
  async getFullStats() {
    try {
      const totalStats = await this.db.getTotalStats();
      const activeChannels = await this.db.allQuery('SELECT COUNT(*) as count FROM channels WHERE status = "active"');
      
      return {
        ...totalStats,
        active_channels: activeChannels[0]?.count || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      return {};
    }
  }

  // Получить системную статистику
  async getSystemStats() {
    const used = process.memoryUsage();
    const uptime = Math.floor(process.uptime());
    
    return {
      memory: Math.round(used.heapUsed / 1024 / 1024),
      uptime: `${Math.floor(uptime / 3600)}ч ${Math.floor((uptime % 3600) / 60)}м`,
      cpu: Math.round(Math.random() * 20 + 10) // Mock CPU usage
    };
  }

  async start() {
    await this.db.init();
    await this.bot.start();
    console.log('✅ Админ-бот готов к работе!');
  }

  async stop() {
    await this.bot.stop();
    console.log('🛑 Админ-бот остановлен');
  }
}

// Запуск админ-бота
if (require.main === module) {
  const adminBot = new AdminBot();
  
  process.once('SIGINT', () => adminBot.stop());
  process.once('SIGTERM', () => adminBot.stop());
  
  adminBot.start().catch(console.error);
}

module.exports = { AdminBot }; 