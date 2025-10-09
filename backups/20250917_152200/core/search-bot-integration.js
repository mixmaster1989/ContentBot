const { GlobalChannelFinder } = require('./global-channel-finder');

class SearchBotIntegration {
  constructor(bot, mtClient) {
    this.bot = bot;
    this.searchEngine = new GlobalChannelFinder();
    this.userSessions = new Map(); // Сессии поиска пользователей
    this.searchHistory = new Map(); // История поиска
    
    console.log('🔍 SearchBotIntegration инициализирован');
  }

  async init(mtClient) {
    try {
      await this.searchEngine.init(mtClient);
      this.setupCommands();
      this.setupCallbacks();
      console.log('✅ Поисковый модуль подключен к боту');
    } catch (error) {
      console.error('❌ Ошибка инициализации поиска:', error);
    }
  }

  setupCommands() {
    // Команда поиска каналов
    this.bot.command('search', async (ctx) => {
      const args = ctx.message.text.split(' ').slice(1);
      if (args.length === 0) {
        await ctx.reply(`
🔍 *Поиск каналов и групп*

Использование:
\`/search запрос\` - Быстрый поиск
\`/search_advanced\` - Расширенный поиск
\`/search_trends\` - Трендовые каналы
\`/search_history\` - История поиска

Примеры:
\`/search крипто\`
\`/search новости спорт\`
\`/search технологии\`
        `, { parse_mode: 'Markdown' });
        return;
      }

      const query = args.join(' ');
      await this.performQuickSearch(ctx, query);
    });

    // Расширенный поиск
    this.bot.command('search_advanced', async (ctx) => {
      await this.startAdvancedSearch(ctx);
    });

    // Трендовые каналы
    this.bot.command('search_trends', async (ctx) => {
      await this.showTrendingChannels(ctx);
    });

    // История поиска
    this.bot.command('search_history', async (ctx) => {
      await this.showSearchHistory(ctx);
    });

    // Рекомендации
    this.bot.command('search_recommend', async (ctx) => {
      await this.showRecommendations(ctx);
    });

    // Поиск по категории
    this.bot.command('search_category', async (ctx) => {
      await this.showCategorySearch(ctx);
    });
  }

  setupCallbacks() {
    // Обработка inline-кнопок для поиска
    this.bot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;
      
      if (data.startsWith('search_')) {
        await this.handleSearchCallback(ctx, data);
      }
      
      await ctx.answerCallbackQuery();
    });
  }

  // Быстрый поиск
  async performQuickSearch(ctx, query) {
    try {
      const userId = ctx.from.id;
      await ctx.reply('🔍 Выполняю поиск...');

      const results = await this.searchEngine.comprehensiveSearch(query, {
        maxResults: 20,
        deepSearch: true,
        timeout: 20000
      });

      // Сохраняем историю
      await this.saveSearchToHistory(userId, query, results.length);

      if (results.length === 0) {
        await ctx.reply(`❌ По запросу "${query}" ничего не найдено.\n\n💡 Попробуйте:\n• Изменить запрос\n• Использовать синонимы\n• Поиск на английском языке`);
        return;
      }

      // Отправляем результаты
      await this.sendSearchResults(ctx, query, results);

    } catch (error) {
      console.error('Ошибка быстрого поиска:', error);
      await ctx.reply('❌ Произошла ошибка при поиске. Попробуйте позже.');
    }
  }

  // Отправка результатов поиска
  async sendSearchResults(ctx, query, results, page = 0) {
    try {
      const pageSize = 5;
      const totalPages = Math.ceil(results.length / pageSize);
      const startIndex = page * pageSize;
      const endIndex = Math.min(startIndex + pageSize, results.length);
      const pageResults = results.slice(startIndex, endIndex);

      let message = `🎯 *Результаты поиска: "${query}"*\n`;
      message += `Найдено: ${results.length} каналов/групп\n`;
      message += `Страница: ${page + 1}/${totalPages}\n\n`;

      for (let i = 0; i < pageResults.length; i++) {
        const result = pageResults[i];
        const number = startIndex + i + 1;
        
        message += `${number}. *${result.title}*\n`;
        message += `${result.type === 'channel' ? '📺' : '👥'} ${result.type === 'channel' ? 'Канал' : 'Группа'}`;
        
        if (result.verified) message += ' ✅';
        message += `\n`;
        
        if (result.participantsCount) {
          message += `👥 ${result.participantsCount.toLocaleString('ru-RU')} участников\n`;
        }
        
        message += `🏷️ ${result.category}\n`;
        
        if (result.description) {
          const desc = result.description.length > 100 
            ? result.description.substring(0, 100) + '...'
            : result.description;
          message += `📝 ${desc}\n`;
        }
        
        if (result.link) {
          message += `🔗 ${result.link}\n`;
        }
        
        message += `\n`;
      }

      // Создаем клавиатуру
      const keyboard = this.createSearchKeyboard(query, results, page, totalPages);

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
        disable_web_page_preview: true
      });

    } catch (error) {
      console.error('Ошибка отправки результатов:', error);
      await ctx.reply('❌ Ошибка отображения результатов');
    }
  }

  // Создание клавиатуры для навигации
  createSearchKeyboard(query, results, currentPage, totalPages) {
    const keyboard = [];
    
    // Навигация по страницам
    if (totalPages > 1) {
      const navRow = [];
      
      if (currentPage > 0) {
        navRow.push({
          text: '⬅️ Назад',
          callback_data: `search_page_${currentPage - 1}_${Buffer.from(query).toString('base64')}`
        });
      }
      
      navRow.push({
        text: `${currentPage + 1}/${totalPages}`,
        callback_data: 'search_noop'
      });
      
      if (currentPage < totalPages - 1) {
        navRow.push({
          text: 'Вперед ➡️',
          callback_data: `search_page_${currentPage + 1}_${Buffer.from(query).toString('base64')}`
        });
      }
      
      keyboard.push(navRow);
    }

    // Действия
    const actionRow = [
      { text: '🔄 Новый поиск', callback_data: 'search_new' },
      { text: '📊 Фильтры', callback_data: `search_filter_${Buffer.from(query).toString('base64')}` }
    ];
    keyboard.push(actionRow);

    const utilsRow = [
      { text: '📈 Тренды', callback_data: 'search_trends' },
      { text: '💾 Экспорт', callback_data: `search_export_${Buffer.from(query).toString('base64')}` }
    ];
    keyboard.push(utilsRow);

    return { inline_keyboard: keyboard };
  }

  // Обработка callback-запросов
  async handleSearchCallback(ctx, data) {
    try {
      const parts = data.split('_');
      const action = parts[1];

      switch (action) {
        case 'page':
          await this.handlePageNavigation(ctx, parts);
          break;
          
        case 'filter':
          await this.handleFilterRequest(ctx, parts);
          break;
          
        case 'export':
          await this.handleExportRequest(ctx, parts);
          break;
          
        case 'new':
          await this.handleNewSearchRequest(ctx);
          break;
          
        case 'trends':
          await this.showTrendingChannels(ctx);
          break;
          
        case 'category':
          await this.handleCategorySelection(ctx, parts);
          break;
          
        case 'advanced':
          await this.handleAdvancedSearchStep(ctx, parts);
          break;
      }
    } catch (error) {
      console.error('Ошибка обработки callback:', error);
    }
  }

  // Навигация по страницам
  async handlePageNavigation(ctx, parts) {
    try {
      const page = parseInt(parts[2]);
      const queryBase64 = parts[3];
      const query = Buffer.from(queryBase64, 'base64').toString();
      
      // Получаем результаты из кэша или повторяем поиск
      const results = await this.searchEngine.comprehensiveSearch(query, {
        maxResults: 20,
        useCache: true
      });
      
      await ctx.editMessageText('🔍 Загружаю страницу...');
      await this.sendSearchResults(ctx, query, results, page);
    } catch (error) {
      console.error('Ошибка навигации:', error);
      await ctx.reply('❌ Ошибка загрузки страницы');
    }
  }

  // Расширенный поиск
  async startAdvancedSearch(ctx) {
    try {
      const userId = ctx.from.id;
      
      // Создаем сессию расширенного поиска
      this.userSessions.set(userId, {
        type: 'advanced_search',
        step: 'query',
        data: {}
      });

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔍 Обычный поиск', callback_data: 'search_advanced_normal' }],
          [{ text: '🎯 Поиск по категории', callback_data: 'search_advanced_category' }],
          [{ text: '🔧 Настройка фильтров', callback_data: 'search_advanced_filters' }],
          [{ text: '❌ Отмена', callback_data: 'search_cancel' }]
        ]
      };

      await ctx.reply(`
🔍 *Расширенный поиск каналов*

Выберите тип поиска:
• *Обычный* - поиск по ключевым словам
• *По категории* - поиск в определенной тематике  
• *С фильтрами* - детальная настройка критериев
      `, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Ошибка расширенного поиска:', error);
    }
  }

  // Показ трендовых каналов
  async showTrendingChannels(ctx) {
    try {
      await ctx.reply('📈 Загружаю трендовые каналы...');
      
      const trends = await this.searchEngine.getTrendingChannels(null, '24h');
      
      if (trends.length === 0) {
        await ctx.reply('📭 Трендовые каналы пока не найдены');
        return;
      }

      let message = '📈 *Трендовые каналы за 24 часа*\n\n';
      
      for (let i = 0; i < Math.min(trends.length, 10); i++) {
        const trend = trends[i];
        message += `${i + 1}. *${trend.channel_title}*\n`;
        if (trend.channel_username) {
          message += `🔗 @${trend.channel_username}\n`;
        }
        message += `👥 ${trend.participants_count?.toLocaleString('ru-RU') || 'Неизвестно'}\n`;
        message += `🔥 ${trend.search_frequency} поисков\n`;
        message += `🏷️ ${trend.category}\n\n`;
      }

      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 За неделю', callback_data: 'search_trends_7d' },
            { text: '📈 За месяц', callback_data: 'search_trends_30d' }
          ],
          [{ text: '🔍 Новый поиск', callback_data: 'search_new' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Ошибка показа трендов:', error);
      await ctx.reply('❌ Ошибка загрузки трендов');
    }
  }

  // Показ истории поиска
  async showSearchHistory(ctx) {
    try {
      const userId = ctx.from.id;
      const history = await this.searchEngine.getUserSearchHistory(userId, 10);
      
      if (history.length === 0) {
        await ctx.reply('📭 История поиска пуста');
        return;
      }

      let message = '📋 *Ваша история поиска*\n\n';
      
      for (let i = 0; i < history.length; i++) {
        const item = history[i];
        const date = new Date(item.created_at * 1000).toLocaleDateString('ru-RU');
        message += `${i + 1}. "${item.query}"\n`;
        message += `📅 ${date} | 📊 ${item.results_count} результатов\n\n`;
      }

      const keyboard = {
        inline_keyboard: [
          [{ text: '🔍 Новый поиск', callback_data: 'search_new' }],
          [{ text: '🗑️ Очистить историю', callback_data: 'search_clear_history' }]
        ]
      };

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Ошибка показа истории:', error);
      await ctx.reply('❌ Ошибка загрузки истории');
    }
  }

  // Показ поиска по категориям
  async showCategorySearch(ctx) {
    try {
      const categories = Object.keys(this.searchEngine.categories);
      const keyboard = [];
      
      // Создаем кнопки по 2 в ряд
      for (let i = 0; i < categories.length; i += 2) {
        const row = [];
        row.push({
          text: `🏷️ ${categories[i]}`,
          callback_data: `search_category_${categories[i]}`
        });
        
        if (i + 1 < categories.length) {
          row.push({
            text: `🏷️ ${categories[i + 1]}`,
            callback_data: `search_category_${categories[i + 1]}`
          });
        }
        
        keyboard.push(row);
      }

      await ctx.reply('🏷️ *Поиск по категориям*\n\nВыберите интересующую вас тематику:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error('Ошибка показа категорий:', error);
    }
  }

  // Сохранение поиска в историю
  async saveSearchToHistory(userId, query, resultsCount) {
    try {
      await this.searchEngine.saveSearchHistory(userId, query, resultsCount);
      
      // Обновляем локальную историю
      if (!this.searchHistory.has(userId)) {
        this.searchHistory.set(userId, []);
      }
      
      const userHistory = this.searchHistory.get(userId);
      userHistory.unshift({ query, resultsCount, timestamp: Date.now() });
      
      // Ограничиваем размер истории
      if (userHistory.length > 50) {
        userHistory.splice(50);
      }
    } catch (error) {
      console.error('Ошибка сохранения истории:', error);
    }
  }

  // Экспорт результатов
  async handleExportRequest(ctx, parts) {
    try {
      const queryBase64 = parts[2];
      const query = Buffer.from(queryBase64, 'base64').toString();
      
      await ctx.reply('📤 Подготавливаю экспорт...');
      
      const exportData = await this.searchEngine.exportResults(query, 'json', {
        maxResults: 100
      });
      
      if (!exportData) {
        await ctx.reply('❌ Ошибка экспорта данных');
        return;
      }

      // Создаем файл
      const filename = `search_${query.replace(/[^a-zа-я0-9]/gi, '_')}_${Date.now()}.json`;
      const content = JSON.stringify(exportData, null, 2);
      
      // В реальной реализации здесь бы отправлялся файл
      await ctx.reply(`📄 *Экспорт готов*\n\nЗапрос: "${query}"\nРезультатов: ${exportData.total}\nФормат: JSON\n\n_Файл: ${filename}_`, {
        parse_mode: 'Markdown'
      });
      
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      await ctx.reply('❌ Ошибка при экспорте');
    }
  }

  // Получение статистики поиска
  getSearchStats() {
    return {
      activeSearchSessions: this.userSessions.size,
      totalHistoryEntries: Array.from(this.searchHistory.values()).reduce((sum, hist) => sum + hist.length, 0),
      searchEngineStats: this.searchEngine.getSearchStats()
    };
  }

  // Очистка ресурсов
  cleanup() {
    this.userSessions.clear();
    this.searchEngine.clearCache();
    console.log('🧹 SearchBotIntegration очищен');
  }
}

module.exports = { SearchBotIntegration };


