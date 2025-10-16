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
    this.payments = new PaymentSystem(this.db);
    this.channelManager = new ChannelManager();
    
    this.setupHandlers();
    this.startScheduler();
    
    console.log('🚀 ContentBot запущен!');
  }

  setupHandlers() {
    // Команда старт
    this.bot.command('start', async (ctx) => {
      const userId = ctx.from.id;
      const username = ctx.from.username || 'без_username';
      const firstName = ctx.from.first_name || 'без_имени';
      
      console.log(`🚀 Пользователь ${firstName} (@${username}, ID: ${userId}) запустил бота`);
      await this.db.createUser(userId, ctx.from.username);
      
      await ctx.reply(`
🤖 *ContentBot* - Нейро-контент агентство!

🔥 Что я умею:
• Автоматически веду Telegram каналы
• Парсю топовый контент и переписываю через ИИ  
• Генерирую уникальные посты с картинками
• Постю по расписанию 24/7

💰 *Тарифы:*
• Ведение канала: ${process.env.MONTHLY_PRICE || 3000}₽/мес
• Настройка канала: ${process.env.CHANNEL_SETUP_PRICE || 10000}₽
• Премиум пакет: ${process.env.PREMIUM_PRICE || 15000}₽/мес

Выберите действие:
      `, { 
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎬 Демо-пост', callback_data: 'demo' }],
            [{ text: '💳 Заказать канал', callback_data: 'order' }],
            [{ text: '📊 Мои каналы', callback_data: 'channels' }],
            [{ text: '❓ Помощь', callback_data: 'help' }]
          ]
        }
      });
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

    // Обработка кнопок и платежей
    this.bot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const userId = ctx.from.id;
      const username = ctx.from.username || 'без_username';
      const firstName = ctx.from.first_name || 'без_имени';
      
      console.log(`🔘 Пользователь ${firstName} (@${username}, ID: ${userId}) нажал кнопку: ${data}`);

      // Обработка кнопок меню
      if (data === 'demo') {
        await ctx.editMessageText('🎬 Генерирую демо-пост...');
        try {
          const demoContent = await this.generateDemoPost();
          await ctx.editMessageText(`📝 *Демо-пост:*\n\n${demoContent}`, { parse_mode: 'Markdown' });
        } catch (error) {
          await ctx.editMessageText('❌ Ошибка генерации демо');
        }
      }

      if (data === 'order') {
        const user = await this.db.getUser(userId);
        if (!user) {
          await ctx.editMessageText('❌ Сначала выполните /start');
          return;
        }

        await ctx.editMessageText(`
💳 *Заказать ведение канала:*

🔸 Ведение канала: ${process.env.MONTHLY_PRICE || 3000}₽/мес
🔸 Настройка канала: ${process.env.CHANNEL_SETUP_PRICE || 10000}₽

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
      }

      if (data === 'channels') {
        const channels = await this.db.getUserChannels(userId);
        
        if (channels.length === 0) {
          await ctx.editMessageText('📭 У вас пока нет каналов. Используйте /order для заказа');
          return;
        }

        let message = '📊 *Ваши каналы:*\n\n';
        for (let channel of channels) {
          message += `🔸 ${channel.channel_name}\n`;
          message += `📈 Статус: ${channel.status}\n`;
          message += `📅 Постов сегодня: ${channel.posts_today}/10\n\n`;
        }

        await ctx.editMessageText(message, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '⚡ Сгенерить сейчас', callback_data: 'generate_now' }],
              [{ text: '🔙 Назад', callback_data: 'back_to_menu' }]
            ]
          }
        });
      }

      if (data === 'help') {
        await ctx.editMessageText(`
🤖 *ContentBot - Помощь*

🔥 *Что я умею:*
• Автоматически веду Telegram каналы
• Парсю топовый контент и переписываю через ИИ  
• Генерирую уникальные посты с картинками
• Постю по расписанию 24/7

📋 *Команды:*
/start - Начать работу с ботом
/demo - Посмотреть демо-пост
/order - Заказать ведение канала
/channels - Мои каналы
/help - Эта справка

💰 *Тарифы:*
• Ведение канала: ${process.env.MONTHLY_PRICE || 3000}₽/мес
• Настройка канала: ${process.env.CHANNEL_SETUP_PRICE || 10000}₽
• Премиум пакет: ${process.env.PREMIUM_PRICE || 15000}₽/мес

❓ *Вопросы?* Пишите @mixmaster1989
        `, { parse_mode: 'Markdown' });
      }

      // Обработка платежей
      if (data === 'pay_yoomoney') {
        const paymentUrl = await this.payments.createYooMoneyPayment(userId, process.env.MONTHLY_PRICE || 3000);
        await ctx.editMessageText(`💳 Оплата через ЮMoney:\n\n${paymentUrl}`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Я оплатил', callback_data: 'payment_confirmed' }],
              [{ text: '❌ Отмена', callback_data: 'payment_cancelled' }]
            ]
          }
        });
      }
      
      if (data === 'payment_confirmed') {
        await ctx.editMessageText(`
🎉 *Оплата подтверждена!*

✅ Подписка активирована на 30 дней
💰 Тариф: Ведение канала

📺 *Следующий шаг:*
Добавьте ваш канал для автоматического ведения

Используйте команду /addchannel или отправьте ссылку на канал
        `, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📺 Добавить канал', callback_data: 'add_channel' }]
            ]
          }
        });
      }
      
      if (data === 'add_channel') {
        await ctx.editMessageText(`
📺 Добавить канал для ведения

1️⃣ Отправьте ссылку на ваш Telegram канал:
• @channel_name
• https://t.me/channel_name
• t.me/channel_name
• https://t.me/+AbCdEfGhIjKlMnOp (пригласительная ссылка)
• +AbCdEfGhIjKlMnOp (пригласительная ссылка)

2️⃣ Перешлите в этот чат любой пост из вашего канала

⚠️ Важно:
• Бот должен быть администратором канала
• У бота должны быть права на публикацию постов
• Канал должен быть публичным или бот должен быть добавлен в приватный канал

После настройки канал будет готов к автоматическому ведению!
        `);
      }
      
      if (data === 'pay_crypto') {
        await ctx.editMessageText(`₿ Криптоплатеж:\n\nПереведите ${process.env.MONTHLY_PRICE || 3000}₽ на:\n${process.env.CRYPTO_WALLET || 'USDT кошелек'}\n\nОтправьте скриншот админу @mixmaster1989`);
      }

      if (data === 'generate_now') {
        const username = ctx.from.username || 'без_username';
        const firstName = ctx.from.first_name || 'без_имени';
        
        console.log(`⚡ Пользователь ${firstName} (@${username}, ID: ${userId}) запросил мгновенную генерацию поста`);
        
        await ctx.editMessageText('⚡ Генерирую пост прямо сейчас...');
        
        try {
          // Получаем каналы пользователя
          const channels = await this.db.getUserChannels(userId);
          
          if (channels.length === 0) {
            await ctx.editMessageText('❌ У вас нет каналов для генерации поста');
            return;
          }
          
          // Берем первый активный канал
          const channel = channels.find(c => c.status === 'active') || channels[0];
          
          if (channel.posts_today >= 10) {
            await ctx.editMessageText('❌ Достигнут лимит постов на сегодня (10/10)');
            return;
          }
          
          // Генерируем контент с учетом темы и стиля канала
          const content = await this.generateContent(channel.topic, channel.style);
          
          // Публикуем в канал через Bot API
          const chatId = this.resolveBotChatId(channel.channel_id);
          if (!chatId) {
            await ctx.editMessageText(
              '❌ Неизвестен chat_id канала для публикации.\n\nДобавьте бота админом в канал и перешлите в чат с ботом любой пост из вашего канала — мы автоматически определим chat_id.'
            );
            return;
          }

          let result = null;
          try {
            const text = content.text || content; 
            const sent = await this.bot.api.sendMessage(chatId, text, {
              disable_web_page_preview: true
            });
            result = { success: true, messageId: sent.message_id };
          } catch (e) {
            result = { success: false, error: e.description || e.message };
          }

          if (result && result.success) {
            // Обновляем счетчик постов
            await this.db.updateChannelPostsToday(channel.id, channel.posts_today + 1);
            
            await ctx.editMessageText(`
✅ *Пост успешно опубликован!*

📺 Канал: ${channel.channel_name}
📝 Стиль: ${channel.style}
📊 Постов сегодня: ${channel.posts_today + 1}/10

🎉 Пост появится в вашем канале через несколько секунд!
            `, { parse_mode: 'Markdown' });
            
            console.log(`✅ Мгновенный пост опубликован в канал ${channel.channel_name} для пользователя ${userId}`);
            
          } else {
            await ctx.editMessageText(`❌ Ошибка публикации: ${result?.error || 'unknown'}\n\nПроверьте, что бот является администратором канала и имеет права на публикацию постов.`);
          }
          
        } catch (error) {
          console.error('Ошибка мгновенной генерации:', error);
          await ctx.editMessageText(`❌ Ошибка генерации поста: ${error.message}`);
        }
      }

      if (data === 'back_to_menu') {
        await ctx.editMessageText(`
🤖 *ContentBot* - Нейро-контент агентство!

🔥 Что я умею:
• Автоматически веду Telegram каналы
• Парсю топовый контент и переписываю через ИИ  
• Генерирую уникальные посты с картинками
• Постю по расписанию 24/7

💰 *Тарифы:*
• Ведение канала: ${process.env.MONTHLY_PRICE || 3000}₽/мес
• Настройка канала: ${process.env.CHANNEL_SETUP_PRICE || 10000}₽
• Премиум пакет: ${process.env.PREMIUM_PRICE || 15000}₽/мес

Выберите действие:
        `, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎬 Демо-пост', callback_data: 'demo' }],
              [{ text: '💳 Заказать канал', callback_data: 'order' }],
              [{ text: '📊 Мои каналы', callback_data: 'channels' }],
              [{ text: '❓ Помощь', callback_data: 'help' }]
            ]
          }
        });
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

    // Команда добавления канала
    this.bot.command('addchannel', async (ctx) => {
      const userId = ctx.from.id;
      const username = ctx.from.username || 'без_username';
      const firstName = ctx.from.first_name || 'без_имени';
      
      console.log(`📺 Пользователь ${firstName} (@${username}, ID: ${userId}) хочет добавить канал`);
      
      await ctx.reply(`
📺 Добавить канал для ведения

Отправьте ссылку на ваш Telegram канал в формате:
• @channel_name
• https://t.me/channel_name
• t.me/channel_name
• https://t.me/+AbCdEfGhIjKlMnOp (пригласительная ссылка)
• +AbCdEfGhIjKlMnOp (пригласительная ссылка)

⚠️ Важно:
• Бот должен быть администратором канала
• У бота должны быть права на публикацию постов
• Канал должен быть публичным или бот должен быть добавлен в приватный канал

После добавления канала начнется автоматическое ведение!
      `);
    });

    // Обработка пересланных сообщений (для получения chat_id канала)
    this.bot.on('message:forward_origin', async (ctx) => {
      const userId = ctx.from.id;
      const forwardFrom = ctx.message.forward_origin;
      
      if (forwardFrom && forwardFrom.type === 'channel') {
        const chatId = forwardFrom.chat.id;
        const channelTitle = forwardFrom.chat.title || 'Неизвестный канал';
        
        console.log(`📺 Пользователь ${userId} переслал пост из канала: ${channelTitle} (${chatId})`);
        
        try {
          // Проверяем, есть ли уже канал у пользователя
          const existingChannels = await this.db.getUserChannels(userId);
          
          if (existingChannels.length > 0) {
            // Обновляем существующий канал с chat_id
            const channel = existingChannels[0];
            await this.db.runQuery(
              'UPDATE channels SET channel_id = ?, channel_name = ?, status = ? WHERE id = ?',
              [chatId.toString(), channelTitle, 'active', channel.id]
            );
            
            await ctx.reply(`
✅ *Chat ID канала получен!*

📺 Канал: ${channelTitle}
🆔 Chat ID: ${chatId}
📊 Статус: Готов к публикации

🎉 Теперь бот может публиковать посты в ваш канал!
Используйте кнопку "⚡ Сгенерить сейчас" для мгновенного поста.
            `);
          } else {
            // Создаем новый канал с chat_id
            await this.db.createChannel(userId, chatId, channelTitle, 'active');
            
            await ctx.reply(`
✅ *Канал добавлен и готов к работе!*

📺 Канал: ${channelTitle}
🆔 Chat ID: ${chatId}
📊 Статус: Активен

🎉 Бот может публиковать посты в ваш канал!
Используйте кнопку "⚡ Сгенерить сейчас" для мгновенного поста.
            `);
          }
          
        } catch (error) {
          console.error('Ошибка обработки пересланного сообщения:', error);
          await ctx.reply('❌ Ошибка обработки канала. Попробуйте еще раз.');
        }
      }
    });

    // Обработка текстовых сообщений (ссылки на каналы)
    this.bot.on('message:text', async (ctx) => {
      const userId = ctx.from.id;
      const text = ctx.message.text;
      
      // Проверяем, является ли сообщение ссылкой на канал
      if (text.match(/^(@\w+|https?:\/\/t\.me\/[\w+]+|t\.me\/[\w+]+|\+[\w-]+)$/)) {
        const username = ctx.from.username || 'без_username';
        const firstName = ctx.from.first_name || 'без_имени';
        
        console.log(`📺 Пользователь ${firstName} (@${username}, ID: ${userId}) добавил канал: ${text}`);
        
        try {
          // Извлекаем username канала
          let channelUsername = text.replace(/^https?:\/\/t\.me\//, '').replace(/^t\.me\//, '').replace(/^@/, '');
          
          // Для пригласительных ссылок используем полную ссылку
          if (text.startsWith('+') || text.includes('+')) {
            channelUsername = text;
          }
          
          // Добавляем канал в БД (без chat_id, будет получен через пересланное сообщение)
          const channelId = await this.db.createChannel(userId, channelUsername, `@${channelUsername}`, 'pending');
          
          await ctx.reply(`
✅ *Канал добавлен!*

📺 Канал: @${channelUsername}
🆔 ID: ${channelId}
📊 Статус: Ожидает настройки

📤 *Следующий шаг:*
Перешлите в этот чат любой пост из вашего канала, чтобы бот получил chat_id для публикации.

После этого канал будет готов к автоматическому ведению!
          `);
          
        } catch (error) {
          console.error('Ошибка добавления канала:', error);
          await ctx.reply('❌ Ошибка добавления канала. Попробуйте еще раз или обратитесь к @mixmaster1989');
        }
      }
    });

    // Команда помощи
    this.bot.command('help', async (ctx) => {
      const userId = ctx.from.id;
      const username = ctx.from.username || 'без_username';
      const firstName = ctx.from.first_name || 'без_имени';
      
      console.log(`❓ Пользователь ${firstName} (@${username}, ID: ${userId}) запросил помощь`);
      await ctx.reply(`
🤖 *ContentBot - Помощь*

🔥 *Что я умею:*
• Автоматически веду Telegram каналы
• Парсю топовый контент и переписываю через ИИ  
• Генерирую уникальные посты с картинками
• Постю по расписанию 24/7

📋 *Команды:*
/start - Начать работу с ботом
/demo - Посмотреть демо-пост
/order - Заказать ведение канала
/channels - Мои каналы
/help - Эта справка

💰 *Тарифы:*
• Ведение канала: ${process.env.MONTHLY_PRICE}₽/мес
• Настройка канала: ${process.env.CHANNEL_SETUP_PRICE}₽
• Премиум пакет: ${process.env.PREMIUM_PRICE}₽/мес

❓ *Вопросы?* Пишите @mixmaster1989
      `, { parse_mode: 'Markdown' });
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

  async generateContent(topic = 'универсальный', style = 'универсальный') {
    // Используем текущую архитектуру: парсинг по теме -> LLM переписывание с учетом стиля
    const content = await this.parser.getContentByTopic(topic);
    const rewritten = await this.llm.rewriteContent(content, style);
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

  // Определяет chat_id для Bot API публикации
  resolveBotChatId(channelId) {
    // Если уже сохранён bot chat id вида -100XXXXXXXXXXXX, используем его
    if (typeof channelId === 'string' && channelId.match(/^\-100\d+$/)) return channelId;
    
    // Если это числовой ID канала, добавляем префикс -100
    if (typeof channelId === 'string' && channelId.match(/^\d+$/)) return `-100${channelId}`;

    // Если сохранена пригласительная ссылка, chat_id определить нельзя без пересланного сообщения
    return null;
  }

  async start() {
    await this.db.init();
    await this.parser.init();
    await this.channelManager.init(this.parser.client);
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