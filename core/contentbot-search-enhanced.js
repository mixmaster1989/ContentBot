require('dotenv').config();
const { Bot, GrammyError, HttpError } = require('grammy');
const { ContentParser } = require('../parsers/content-parser');
const { LLMRewriter } = require('../llm/llm-rewriter');
const { PaymentSystem } = require('../payments/payment-system');
const { Database } = require('./database');
const { ChannelManager } = require('./channel-manager');
const { SearchBotIntegration } = require('./search-bot-integration');
const { MTProtoClient } = require('../../telegram_parser/dist/mtproto/client');
const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');

class ContentBotSearchEnhanced {
  constructor() {
    this.bot = new Bot(process.env.BOT_TOKEN);
    this.db = new Database();
    this.parser = new ContentParser();
    this.llm = new LLMRewriter();
    this.payments = new PaymentSystem();
    this.channelManager = new ChannelManager();
    
    // Новый поисковый модуль
    this.searchIntegration = null;
    this.mtClient = null;
    
    this.setupHandlers();
    this.startScheduler();
    
    console.log('🚀 ContentBot с поисковым модулем запущен!');
  }

  async setupSearchModule() {
    try {
      // Инициализируем MTProto клиент
      this.mtClient = MTProtoClient.get();
      const client = this.mtClient.getClient();
      await client.connect();
      
      // Инициализируем поисковый модуль
      this.searchIntegration = new SearchBotIntegration(this.bot, client);
      await this.searchIntegration.init(client);
      
      console.log('✅ Поисковый модуль успешно подключен');
    } catch (error) {
      console.error('❌ Ошибка подключения поискового модуля:', error);
    }
  }

  setupHandlers() {
    // Команда старт с поисковыми возможностями
    this.bot.command('start', async (ctx) => {
      const userId = ctx.from.id;
      await this.db.createUser(userId, ctx.from.username);
      
      await ctx.reply(`
🤖 *ContentBot* - Нейро-контент агентство!

🔥 *Основные возможности:*
• Автоматически веду Telegram каналы
• Парсю топовый контент и переписываю через ИИ  
• Генерирую уникальные посты с картинками
• Постю по расписанию 24/7

🔍 *Новый поисковый модуль:*
• Глобальный поиск по каналам и группам
• Поиск по категориям и фильтрам
• Рекомендации и тренды
• Экспорт результатов

💰 *Тарифы:*
• Ведение канала: ${process.env.MONTHLY_PRICE}₽/мес
• Настройка канала: ${process.env.CHANNEL_SETUP_PRICE}₽
• Премиум пакет: ${process.env.PREMIUM_PRICE}₽/мес

*Команды контента:*
/demo - Посмотреть демо
/order - Заказать канал
/channels - Мои каналы

*Команды поиска:*
/search запрос - Поиск каналов
/search_advanced - Расширенный поиск
/search_trends - Трендовые каналы
/search_category - Поиск по категориям

/help - Полная помощь
      `, { parse_mode: 'Markdown' });
    });

    // Расширенная команда помощи
    this.bot.command('help', async (ctx) => {
      await ctx.reply(`
📖 *Полное руководство ContentBot*

🎯 *КОНТЕНТ-ФУНКЦИИ:*
/demo - Генерация демо-поста
/order - Заказ ведения канала  
/channels - Управление каналами
/analytics - Статистика постов

🔍 *ПОИСК КАНАЛОВ:*
/search [запрос] - Быстрый поиск
• Пример: \`/search криптовалюты\`
• Пример: \`/search новости спорт\`

/search_advanced - Расширенный поиск
• Поиск с фильтрами
• Настройка критериев
• Множественные параметры

/search_trends - Трендовые каналы
• Популярные за 24 часа
• Популярные за неделю
• Популярные за месяц

/search_category - Поиск по категориям
• Новости, Технологии, Бизнес
• Игры, Музыка, Спорт
• Образование, Финансы, Крипто

/search_history - История ваших поисков
/search_recommend - Персональные рекомендации

📊 *ФИЛЬТРЫ ПОИСКА:*
• Тип: каналы/группы/все
• Размер: малые/средние/большие
• Верификация: только верифицированные
• Категория: любая тематика
• Язык: русский/английский/все

💾 *ЭКСПОРТ РЕЗУЛЬТАТОВ:*
• JSON формат для анализа
• CSV для таблиц
• Markdown для документации

🎛️ *РАСШИРЕННЫЕ ВОЗМОЖНОСТИ:*
• Поиск с синонимами
• Интеллектуальная фильтрация
• Рекомендации похожих каналов
• Анализ трендов в реальном времени

💡 *СОВЕТЫ ПО ПОИСКУ:*
• Используйте конкретные ключевые слова
• Пробуйте синонимы на разных языках
• Комбинируйте несколько тем
• Используйте фильтры для точности

⚡ *БЫСТРЫЕ КОМАНДЫ:*
\`/search крипто деfi\` - Поиск по криптовалютам
\`/search новости россия\` - Российские новости
\`/search игры steam\` - Игровые каналы
\`/search обучение python\` - Обучающие материалы

🔧 *ТЕХНИЧЕСКАЯ ПОДДЕРЖКА:*
/status - Статус систем
/feedback - Обратная связь
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
🔸 Премиум пакет: ${process.env.PREMIUM_PRICE}₽/мес

*Премиум включает:*
• До 5 каналов
• Приоритетная поддержка  
• Расширенная аналитика
• Персональные рекомендации каналов
• Экспорт поисковых данных

Выберите способ оплаты:
      `, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 ЮMoney', callback_data: 'pay_yoomoney' }],
            [{ text: '₿ Криптовалюта', callback_data: 'pay_crypto' }],
            [{ text: '🎁 Промокод', callback_data: 'pay_promo' }]
          ]
        }
      });
    });

    // Аналитика и статистика
    this.bot.command('analytics', async (ctx) => {
      const userId = ctx.from.id;
      const user = await this.db.getUser(userId);
      
      if (!user || user.subscription_status === 'free') {
        await ctx.reply('📊 Аналитика доступна только для подписчиков. Используйте /order для подключения.');
        return;
      }

      try {
        const channels = await this.db.getUserChannels(userId);
        const searchStats = this.searchIntegration ? this.searchIntegration.getSearchStats() : null;
        
        let message = '📊 *Ваша аналитика*\n\n';
        
        // Статистика каналов
        message += `📺 *Каналы: ${channels.length}*\n`;
        let totalPosts = 0;
        for (let channel of channels) {
          totalPosts += channel.posts_total || 0;
        }
        message += `📝 Всего постов: ${totalPosts}\n`;
        message += `📅 Постов сегодня: ${channels.reduce((sum, ch) => sum + (ch.posts_today || 0), 0)}\n\n`;
        
        // Статистика поиска
        if (searchStats) {
          message += `🔍 *Поисковая активность:*\n`;
          message += `• Активные сессии: ${searchStats.activeSearchSessions}\n`;
          message += `• Записей в истории: ${searchStats.totalHistoryEntries}\n`;
          message += `• Размер кэша: ${searchStats.searchEngineStats.cacheSize}\n\n`;
        }
        
        await ctx.reply(message, { parse_mode: 'Markdown' });
        
      } catch (error) {
        console.error('Ошибка аналитики:', error);
        await ctx.reply('❌ Ошибка получения аналитики');
      }
    });

    // Статус системы
    this.bot.command('status', async (ctx) => {
      try {
        const dbStats = await this.db.getTotalStats();
        const searchStats = this.searchIntegration ? this.searchIntegration.getSearchStats() : null;
        
        let message = '⚡ *Статус системы*\n\n';
        message += `👥 Пользователей: ${dbStats.total_users}\n`;
        message += `📺 Каналов: ${dbStats.total_channels}\n`;
        message += `📝 Постов: ${dbStats.total_posts}\n`;
        message += `💰 Доход: ${dbStats.total_revenue}₽\n\n`;
        
        message += `🤖 *Статус модулей:*\n`;
        message += `• Основной бот: ✅ Работает\n`;
        message += `• База данных: ✅ Подключена\n`;
        message += `• Парсер контента: ✅ Активен\n`;
        message += `• LLM переписчик: ✅ Готов\n`;
        message += `• Поисковый модуль: ${this.searchIntegration ? '✅ Активен' : '❌ Отключен'}\n`;
        message += `• Платежная система: ✅ Работает\n\n`;
        
        if (searchStats) {
          message += `🔍 *Поисковая статистика:*\n`;
          message += `• Доступно категорий: ${searchStats.searchEngineStats.availableCategories}\n`;
          message += `• Размер кэша: ${searchStats.searchEngineStats.cacheSize} записей\n`;
        }
        
        await ctx.reply(message, { parse_mode: 'Markdown' });
        
      } catch (error) {
        await ctx.reply('❌ Ошибка получения статуса системы');
      }
    });

    // Обратная связь
    this.bot.command('feedback', async (ctx) => {
      await ctx.reply(`
📝 *Обратная связь*

Мы ценим ваше мнение! Напишите нам:

🐛 **Нашли ошибку?**
• Опишите проблему
• Укажите шаги воспроизведения
• Приложите скриншоты если возможно

💡 **Есть предложения?**
• Новые функции поиска
• Улучшения интерфейса
• Дополнительные категории

📊 **Нужна помощь?**
• Настройка поиска
• Использование фильтров
• Экспорт данных

Отправьте сообщение боту, начиная с \`#feedback\`

Пример: \`#feedback Хотел бы видеть поиск по дате создания канала\`
      `, { parse_mode: 'Markdown' });
    });

    // Обработка платежей
    this.bot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;
      const userId = ctx.from.id;

      // Платежные callback'и
      if (data === 'pay_yoomoney') {
        const paymentUrl = await this.payments.createYooMoneyPayment(userId, process.env.MONTHLY_PRICE);
        await ctx.editMessageText(`💳 Оплата через ЮMoney:\n\n${paymentUrl}`);
      }
      
      if (data === 'pay_crypto') {
        await ctx.editMessageText(`₿ Криптоплатеж:\n\nПереведите ${process.env.MONTHLY_PRICE}₽ на:\n${process.env.CRYPTO_WALLET}\n\nОтправьте скриншот админу @your_admin`);
      }

      if (data === 'pay_promo') {
        await ctx.editMessageText(`🎁 Введите промокод:\n\nОтправьте сообщение в формате:\n\`/promo ВАШ_ПРОМОКОД\``, { parse_mode: 'Markdown' });
      }

      await ctx.answerCallbackQuery();
    });

    // Обработка промокодов
    this.bot.command('promo', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length === 0) {
        await ctx.reply('❌ Укажите промокод: /promo ВАШ_ПРОМОКОД');
        return;
      }

      const promoCode = args[0];
      const userId = ctx.from.id;
      
      // Здесь логика проверки промокода
      await ctx.reply('🎁 Проверяю промокод...');
      
      // Заглушка для промокода
      if (promoCode === 'SEARCH2024') {
        await this.db.updateUserSubscription(userId, 'premium', Math.floor(Date.now() / 1000) + 30 * 24 * 3600);
        await ctx.reply('🎉 Промокод активирован! Вам предоставлен премиум на 30 дней с полным доступом к поисковому модулю!');
      } else {
        await ctx.reply('❌ Промокод недействителен или истек');
      }
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
        message += `🔸 ${channel.channel_name}\n`;
        message += `📈 Статус: ${channel.status}\n`;
        message += `📅 Постов сегодня: ${channel.posts_today}/10\n`;
        message += `📝 Всего постов: ${channel.posts_total}\n`;
        message += `🏷️ Тематика: ${channel.topic}\n`;
        message += `✍️ Стиль: ${channel.style}\n\n`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔍 Найти похожие каналы', callback_data: 'find_similar_channels' }],
          [{ text: '📊 Подробная аналитика', callback_data: 'detailed_analytics' }]
        ]
      };

      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard 
      });
    });

    // Обработка текстовых сообщений для фидбека
    this.bot.on('message:text', async (ctx) => {
      const text = ctx.message.text;
      
      if (text.startsWith('#feedback')) {
        const feedback = text.replace('#feedback', '').trim();
        const userId = ctx.from.id;
        const username = ctx.from.username || 'Не указан';
        
        console.log(`📝 Feedback от ${username} (${userId}): ${feedback}`);
        
        await ctx.reply('✅ Спасибо за обратную связь! Мы обязательно рассмотрим ваше предложение.');
        
        // Здесь можно отправить уведомление администраторам
        return;
      }
      
      // Если не команда и не фидбек, предлагаем использовать поиск
      if (!text.startsWith('/')) {
        await ctx.reply(`
🔍 Возможно, вы хотите найти каналы по запросу "${text}"?

Используйте: \`/search ${text}\`

Или попробуйте:
• /search_advanced - расширенный поиск
• /search_category - поиск по категориям
• /search_trends - трендовые каналы
        `, { parse_mode: 'Markdown' });
      }
    });

    // Обработка ошибок
    this.bot.catch((err) => {
      const ctx = err.ctx;
      console.error(`Ошибка для ${ctx.update.update_id}:`, err.error);
      
      if (err.error instanceof GrammyError) {
        console.error('Ошибка в запросе к Telegram:', err.error.description);
      } else if (err.error instanceof HttpError) {
        console.error('Не удалось связаться с Telegram:', err.error);
      } else {
        console.error('Неизвестная ошибка:', err.error);
      }
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

    // Каждый день в полночь сбрасываем счетчики постов
    cron.schedule('0 0 * * *', async () => {
      console.log('🔄 Сброс ежедневных счетчиков...');
      await this.db.resetDailyPostCounts();
    });

    // Очистка кэша поиска каждые 6 часов
    cron.schedule('0 */6 * * *', async () => {
      console.log('🧹 Очистка кэша поиска...');
      if (this.searchIntegration) {
        this.searchIntegration.cleanup();
      }
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
        
        console.log(`✅ Пост опубликован в канал ${channel.channel_name}`);
        
      } catch (error) {
        console.error(`❌ Ошибка для канала ${channel.channel_name}:`, error);
      }
    }
  }

  async start() {
    try {
      await this.db.init();
      
      // Подключаем поисковый модуль
      await this.setupSearchModule();
      
      await this.bot.start();
      console.log('✅ ContentBot с поисковым модулем готов к работе!');
    } catch (error) {
      console.error('❌ Ошибка запуска бота:', error);
    }
  }

  async stop() {
    try {
      // Очищаем ресурсы поискового модуля
      if (this.searchIntegration) {
        this.searchIntegration.cleanup();
      }
      
      // Отключаем MTProto клиент
      if (this.mtClient) {
        const client = this.mtClient.getClient();
        await client.disconnect();
      }
      
      await this.bot.stop();
      console.log('🛑 ContentBot остановлен');
    } catch (error) {
      console.error('❌ Ошибка остановки бота:', error);
    }
  }
}

// Запуск бота
if (require.main === module) {
  const contentBot = new ContentBotSearchEnhanced();
  
  // Graceful shutdown
  process.once('SIGINT', () => contentBot.stop());
  process.once('SIGTERM', () => contentBot.stop());
  
  contentBot.start().catch(console.error);
}

module.exports = { ContentBotSearchEnhanced };
