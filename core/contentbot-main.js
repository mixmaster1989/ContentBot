require('dotenv').config();
const { Bot, GrammyError, HttpError } = require('grammy');
const { ContentParser } = require('../parsers/content-parser');
const { LLMRewriter } = require('../llm/llm-rewriter');
const { PaymentSystem } = require('../payments/payment-system');
const { Database } = require('./database');
const { ChannelManager } = require('./channel-manager');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

class ContentBot {
  constructor() {
    this.bot = new Bot(process.env.BOT_TOKEN);
    this.db = new Database();
    this.parser = new ContentParser();
    this.llm = new LLMRewriter();
    this.payments = new PaymentSystem();
    this.channelManager = new ChannelManager();
    
    this.setupHandlers();
    this.startScheduler();
    
    console.log('🚀 ContentBot запущен!');
  }

  setupHandlers() {
    // Команда старт
    this.bot.command('start', async (ctx) => {
      const userId = ctx.from.id;
      await this.db.createUser(userId, ctx.from.username);
      
      await ctx.reply(`
🤖 *ContentBot* - Нейро-контент агентство!

🔥 Что я умею:
• Автоматически веду Telegram каналы
• Парсю топовый контент и переписываю через ИИ  
• Генерирую уникальные посты с картинками
• Постю по расписанию 24/7

💰 *Тарифы:*
• Ведение канала: ${process.env.MONTHLY_PRICE}₽/мес
• Настройка канала: ${process.env.CHANNEL_SETUP_PRICE}₽
• Премиум пакет: ${process.env.PREMIUM_PRICE}₽/мес

/demo - Посмотреть демо
/order - Заказать канал
/channels - Мои каналы
/help - Помощь
      `, { parse_mode: 'Markdown' });
    });

    // Демо функции
    this.bot.command('demo', async (ctx) => {
      await ctx.reply('🎬 Генерирую демо-пост...');
      
      try {
        const demoContent = await this.generateDemoPost();
        await ctx.reply(`📝 *Демо-пост:*\n\n${demoContent}`, { parse_mode: 'Markdown' });
      } catch (error) {
        await ctx.reply('❌ Ошибка генерации демо');
      }
    });

    // Заказ канала
    this.bot.command('order', async (ctx) => {
      const userId = ctx.from.id;
      const user = await this.db.getUser(userId);
      
      if (!user) {
        await ctx.reply('❌ Сначала выполните /start');
        return;
      }

      await ctx.reply(`
💳 *Заказать ведение канала:*

🔸 Ведение канала: ${process.env.MONTHLY_PRICE}₽/мес
🔸 Настройка канала: ${process.env.CHANNEL_SETUP_PRICE}₽

Выберите способ оплаты:
      `, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 ЮMoney', callback_data: 'pay_yoomoney' }],
            [{ text: '₿ Криптовалюта', callback_data: 'pay_crypto' }]
          ]
        }
      });
    });

    // Обработка платежей
    this.bot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const userId = ctx.from.id;

      if (data === 'pay_yoomoney') {
        const paymentUrl = await this.payments.createYooMoneyPayment(userId, process.env.MONTHLY_PRICE);
        await ctx.editMessageText(`💳 Оплата через ЮMoney:\n\n${paymentUrl}`);
      }
      
      if (data === 'pay_crypto') {
        await ctx.editMessageText(`₿ Криптоплатеж:\n\nПереведите ${process.env.MONTHLY_PRICE}₽ на:\n${process.env.CRYPTO_WALLET}\n\nОтправьте скриншот админу @your_admin`);
      }

      await ctx.answerCallbackQuery();
    });

    // Мои каналы
    this.bot.command('channels', async (ctx) => {
      const userId = ctx.from.id;
      const channels = await this.db.getUserChannels(userId);
      
      if (channels.length === 0) {
        await ctx.reply('📭 У вас пока нет каналов. Используйте /order для заказа');
        return;
      }

      let message = '📊 *Ваши каналы:*\n\n';
      for (let channel of channels) {
        message += `🔸 ${channel.name}\n`;
        message += `📈 Статус: ${channel.status}\n`;
        message += `📅 Постов сегодня: ${channel.posts_today}/10\n\n`;
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    });

    // Обработка ошибок
    this.bot.catch((err) => {
      const ctx = err.ctx;
      console.error(`Ошибка для ${ctx.update.update_id}:`, err.error);
    });
  }

  async generateDemoPost() {
    // Парсим случайный контент
    const content = await this.parser.getRandomContent();
    
    // Переписываем через LLM
    const rewritten = await this.llm.rewriteContent(content, 'универсальный');
    
    return rewritten;
  }

  startScheduler() {
    // Каждые 30 минут проверяем и постим контент
    cron.schedule('*/30 * * * *', async () => {
      console.log('🔄 Запуск автопостинга...');
      await this.processActiveChannels();
    });

    // Каждый час проверяем платежи
    cron.schedule('0 * * * *', async () => {
      console.log('💳 Проверка платежей...');
      await this.payments.checkPayments();
    });
  }

  async processActiveChannels() {
    const activeChannels = await this.db.getActiveChannels();
    
    for (let channel of activeChannels) {
      try {
        if (channel.posts_today >= 10) continue; // Лимит постов в день
        
        // Парсим контент по тематике канала
        const content = await this.parser.getContentByTopic(channel.topic);
        
        // Переписываем через LLM
        const rewritten = await this.llm.rewriteContent(content, channel.style);
        
        // Постим в канал
        await this.channelManager.postToChannel(channel.id, rewritten);
        
        // Обновляем счетчик
        await this.db.incrementPostCount(channel.id);
        
        console.log(`✅ Пост опубликован в канал ${channel.name}`);
        
      } catch (error) {
        console.error(`❌ Ошибка для канала ${channel.name}:`, error);
      }
    }
  }

  async start() {
    await this.db.init();
    await this.bot.start();
    console.log('✅ ContentBot готов к работе!');
  }

  async stop() {
    await this.bot.stop();
    console.log('🛑 ContentBot остановлен');
  }
}

// Запуск бота
if (require.main === module) {
  const contentBot = new ContentBot();
  
  // Graceful shutdown
  process.once('SIGINT', () => contentBot.stop());
  process.once('SIGTERM', () => contentBot.stop());
  
  contentBot.start().catch(console.error);
}

module.exports = { ContentBot }; 