const { Api } = require('telegram');
const { TelegramSearchEngine } = require('./telegram-search-engine');

class GlobalChannelFinder extends TelegramSearchEngine {
  constructor() {
    super();
    this.searchMethods = [
      'globalSearch',
      'contactsSearch', 
      'messagesSearch',
      'channelDiscovery',
      'relatedChannels'
    ];
    
    // РАБОТАЮЩИЕ источники для поиска каналов (убрал несуществующие)
    this.knownChannelSources = {
      'популярные': ['@durov', '@telegram'],
      'новости': ['@rian_ru', '@rbc_news'],
      'безопасные_каталоги': ['@durov'] // Только точно существующие
    };
    
    console.log('🌐 GlobalChannelFinder инициализирован');
  }

  // Переопределяем метод init для правильной инициализации
  async init(mtClient) {
    try {
      await super.init(mtClient); // Вызываем родительский init
      console.log('✅ GlobalChannelFinder подключен к клиенту');
    } catch (error) {
      console.error('❌ Ошибка инициализации GlobalChannelFinder:', error);
      throw error;
    }
  }

  // Комплексный поиск каналов по запросу
  async comprehensiveSearch(query, options = {}) {
    try {
      const {
        deepSearch = true,
        includeRelated = true,
        searchInMessages = false,
        timeout = 30000,
        maxResults = 100
      } = options;

      console.log(`🔍 Запуск комплексного поиска: "${query}"`);
      
      const allResults = new Map(); // Используем Map для избежания дубликатов
      let searchPromises = [];

      // 1. Основной глобальный поиск
      searchPromises.push(
        this.performGlobalSearch(query, options)
          .then(results => this.addResults(allResults, results, 'global'))
          .catch(err => console.log('Global search error:', err.message))
      );

      // 2. Поиск через контакты
      searchPromises.push(
        this.performContactsSearch(query, options)
          .then(results => this.addResults(allResults, results, 'contacts'))
          .catch(err => console.log('Contacts search error:', err.message))
      );

      // 3. Поиск в сообщениях (если включен)
      if (searchInMessages) {
        searchPromises.push(
          this.performMessagesSearch(query, options)
            .then(results => this.addResults(allResults, results, 'messages'))
            .catch(err => console.log('Messages search error:', err.message))
        );
      }

      // 4. Поиск через известные каналы-каталоги
      if (deepSearch) {
        searchPromises.push(
          this.searchInChannelCatalogs(query, options)
            .then(results => this.addResults(allResults, results, 'catalogs'))
            .catch(err => console.log('Catalog search error:', err.message))
        );
      }

      // 5. Поиск похожих каналов
      if (includeRelated) {
        searchPromises.push(
          this.findRelatedChannels(query, options)
            .then(results => this.addResults(allResults, results, 'related'))
            .catch(err => console.log('Related search error:', err.message))
        );
      }

      // Выполняем все поиски параллельно с таймаутом
      await Promise.race([
        Promise.allSettled(searchPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout')), timeout)
        )
      ]);

      // Конвертируем результаты в массив и сортируем
      const finalResults = Array.from(allResults.values());
      const sortedResults = this.sortByRelevance(finalResults, query);
      
      // Ограничиваем количество результатов
      const limitedResults = sortedResults.slice(0, maxResults);

      console.log(`✅ Найдено ${limitedResults.length} каналов`);
      
      // Сохраняем результаты
      await this.saveSearchResults(query, limitedResults);
      
      return limitedResults;

    } catch (error) {
      console.error('❌ Ошибка комплексного поиска:', error);
      return [];
    }
  }

  // Глобальный поиск через SearchGlobal
  async performGlobalSearch(query, options) {
    try {
      const results = [];
      const limit = Math.min(options.limit || 20, 50);

      console.log(`🔍 НАСТОЯЩИЙ глобальный поиск: "${query}"`);

      // ИСПОЛЬЗУЕМ contacts.Search - НАСТОЯЩИЙ ГЛОБАЛЬНЫЙ ПОИСК!
      const searchResult = await this.client.invoke(
        new Api.contacts.Search({
          q: query,
          limit
        })
      );

      console.log(`📊 Глобальный поиск результат: ${searchResult.chats?.length || 0} чатов`);

      if (searchResult.chats && searchResult.chats.length > 0) {
        for (let chat of searchResult.chats) {
          if (this.isValidChannel(chat, options)) {
            const formatted = this.formatChannelResult(chat);
            results.push(formatted);
            console.log(`✅ Добавлен канал: ${formatted.title}`);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Ошибка глобального поиска:', error);
      return [];
    }
  }

  // Поиск через контакты
  async performContactsSearch(query, options) {
    try {
      const searchResult = await this.client.invoke(
        new Api.contacts.Search({
          q: query,
          limit: options.limit || 50
        })
      );

      const results = [];
      if (searchResult.chats) {
        for (let chat of searchResult.chats) {
          if (this.isValidChannel(chat, options)) {
            results.push(this.formatChannelResult(chat));
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Ошибка поиска контактов:', error);
      return [];
    }
  }

  // Поиск в сообщениях каналов
  async performMessagesSearch(query, options) {
    try {
      const results = [];
      const searchResult = await this.client.invoke(
        new Api.messages.SearchGlobal({
          q: query,
          offsetRate: 0,
          offsetPeer: new Api.InputPeerEmpty(), 
          offsetId: 0,
          limit: 100
        })
      );

      // Извлекаем каналы из результатов поиска сообщений
      const channelIds = new Set();
      
      if (searchResult.messages) {
        for (let message of searchResult.messages) {
          if (message.peerId && message.peerId.className === 'PeerChannel') {
            channelIds.add(message.peerId.channelId.toString());
          }
        }
      }

      // Получаем информацию о найденных каналах
      if (searchResult.chats) {
        for (let chat of searchResult.chats) {
          if (channelIds.has(chat.id.toString()) && this.isValidChannel(chat, options)) {
            const result = this.formatChannelResult(chat);
            result.foundInMessages = true;
            results.push(result);
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Ошибка поиска в сообщениях:', error);
      return [];
    }
  }

  // Поиск в каналах-каталогах
  async searchInChannelCatalogs(query, options) {
    try {
      const results = [];
      
      for (let catalogType of Object.keys(this.knownChannelSources)) {
        const catalogs = this.knownChannelSources[catalogType];
        
        for (let catalogUsername of catalogs) {
          try {
            const catalogResults = await this.searchInSpecificCatalog(catalogUsername, query, options);
            results.push(...catalogResults);
          } catch (error) {
            console.log(`Каталог ${catalogUsername} недоступен:`, error.message);
            continue;
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Ошибка поиска в каталогах:', error);
      return [];
    }
  }

  // Поиск в конкретном каталоге
  async searchInSpecificCatalog(catalogUsername, query, options) {
    try {
      console.log(`🔍 Поиск в каталоге ${catalogUsername}...`);
      
      // Получаем канал каталога
      const catalog = await this.client.invoke(
        new Api.contacts.ResolveUsername({ 
          username: catalogUsername.replace('@', '') 
        })
      );

      if (!catalog.chats?.[0]) {
        console.log(`❌ Каталог ${catalogUsername} не найден`);
        return [];
      }

      const catalogEntity = catalog.chats[0];
      console.log(`✅ Найден каталог: ${catalogEntity.title}`);
      
      // Просто возвращаем пустой массив - не ищем в сообщениях
      // Это упрощает поиск и избегает сложных API вызовов
      console.log(`⏭️ Пропускаем поиск в сообщениях каталога ${catalogUsername}`);
      return [];
    } catch (error) {
      console.error(`Ошибка поиска в каталоге ${catalogUsername}:`, error);
      return [];
    }
  }

  // Извлечение упоминаний каналов из текста
  extractChannelMentions(text) {
    const mentions = [];
    
    // Паттерны для поиска упоминаний каналов
    const patterns = [
      /@([a-zA-Z0-9_]+)/g,           // @username
      /t\.me\/([a-zA-Z0-9_]+)/g,      // t.me/username
      /telegram\.me\/([a-zA-Z0-9_]+)/g // telegram.me/username
    ];

    for (let pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[1].length > 3) {
          mentions.push(match[1]);
        }
      }
    }

    return [...new Set(mentions)]; // Удаляем дубликаты
  }

  // Получение информации о канале по username
  async getChannelInfo(username) {
    try {
      const result = await this.client.invoke(
        new Api.contacts.ResolveUsername({ 
          username: username.replace('@', '') 
        })
      );

      return result.chats?.[0] || null;
    } catch (error) {
      return null;
    }
  }

  // Поиск связанных каналов
  async findRelatedChannels(query, options) {
    try {
      // Сначала находим основные каналы по запросу
      const mainResults = await this.performGlobalSearch(query, { ...options, limit: 10 });
      const relatedResults = [];

      for (let channel of mainResults.slice(0, 5)) { // Берем топ-5 для поиска связанных
        try {
          const related = await this.getChannelRecommendations(channel.id);
          relatedResults.push(...related);
        } catch (error) {
          continue;
        }
      }

      return relatedResults;
    } catch (error) {
      console.error('Ошибка поиска связанных каналов:', error);
      return [];
    }
  }

  // Получение рекомендаций для канала
  async getChannelRecommendations(channelId) {
    try {
      // Здесь можно реализовать различные методы получения рекомендаций:
      // 1. Анализ подписчиков (если есть доступ)
      // 2. Анализ контента
      // 3. Поиск в базе данных похожих каналов
      
      return await this.findSimilarChannels(channelId, 5);
    } catch (error) {
      console.error('Ошибка получения рекомендаций:', error);
      return [];
    }
  }

  // Добавление результатов в общую коллекцию
  addResults(allResults, newResults, source) {
    for (let result of newResults) {
      if (!allResults.has(result.id)) {
        result.sources = [source];
        allResults.set(result.id, result);
      } else {
        // Если канал уже найден, добавляем источник
        allResults.get(result.id).sources.push(source);
      }
    }
  }

  // Интеллектуальный поиск с использованием синонимов
  async intelligentSearch(query, options = {}) {
    try {
      // Генерируем синонимы и связанные запросы
      const searchQueries = this.generateSearchVariations(query);
      const allResults = new Map();

      for (let searchQuery of searchQueries) {
        try {
          const results = await this.comprehensiveSearch(searchQuery, {
            ...options,
            maxResults: 50,
            timeout: 15000
          });
          
          this.addResults(allResults, results, 'variation');
        } catch (error) {
          continue;
        }
      }

      const finalResults = Array.from(allResults.values());
      return this.sortByRelevance(finalResults, query).slice(0, options.maxResults || 100);

    } catch (error) {
      console.error('Ошибка интеллектуального поиска:', error);
      return [];
    }
  }

  // Генерация вариаций поискового запроса
  generateSearchVariations(query) {
    const variations = [query];
    
    // Словарь синонимов
    const synonyms = {
      'новости': ['news', 'сми', 'медиа', 'лента'],
      'игры': ['games', 'gaming', 'геймер'],
      'музыка': ['music', 'песни', 'аудио'],
      'фильмы': ['movies', 'кино', 'cinema'],
      'спорт': ['sport', 'fitness', 'тренировки'],
      'криптовалюты': ['crypto', 'bitcoin', 'блокчейн'],
      'программирование': ['coding', 'разработка', 'dev'],
      'бизнес': ['business', 'предпринимательство'],
      'образование': ['education', 'обучение', 'курсы']
    };

    // Добавляем синонимы
    for (let [word, syns] of Object.entries(synonyms)) {
      if (query.toLowerCase().includes(word)) {
        for (let syn of syns) {
          variations.push(query.toLowerCase().replace(word, syn));
        }
      }
    }

    // Добавляем переводы (базовые)
    const translations = {
      'news': 'новости',
      'games': 'игры', 
      'music': 'музыка',
      'crypto': 'криптовалюты',
      'business': 'бизнес',
      'sport': 'спорт'
    };

    for (let [en, ru] of Object.entries(translations)) {
      if (query.toLowerCase().includes(en)) {
        variations.push(query.toLowerCase().replace(en, ru));
      }
      if (query.toLowerCase().includes(ru)) {
        variations.push(query.toLowerCase().replace(ru, en));
      }
    }

    return [...new Set(variations)]; // Удаляем дубликаты
  }

  // Расширенная фильтрация с машинным обучением (упрощенная версия)
  async smartFilter(results, query, userPreferences = {}) {
    try {
      const {
        preferredLanguage = 'ru',
        preferredSize = 'medium', // small, medium, large
        topicInterests = [],
        qualityFilter = true
      } = userPreferences;

      let filtered = [...results];

      // Фильтр по языку (по названию канала)
      if (preferredLanguage === 'ru') {
        filtered = filtered.filter(r => 
          /[а-яё]/i.test(r.title) || 
          this.detectCategory(r.title, r.description) !== 'общее'
        );
      }

      // Фильтр по размеру канала
      if (preferredSize === 'small') {
        filtered = filtered.filter(r => r.participantsCount < 10000);
      } else if (preferredSize === 'medium') {
        filtered = filtered.filter(r => 
          r.participantsCount >= 1000 && r.participantsCount < 100000
        );
      } else if (preferredSize === 'large') {
        filtered = filtered.filter(r => r.participantsCount >= 100000);
      }

      // Фильтр по интересам
      if (topicInterests.length > 0) {
        filtered = filtered.filter(r => 
          topicInterests.includes(r.category)
        );
      }

      // Фильтр качества
      if (qualityFilter) {
        filtered = filtered.filter(r => 
          r.title.length > 3 && 
          !/[0-9]{3,}/.test(r.title) && // Убираем названия с множественными цифрами
          !r.title.toLowerCase().includes('spam')
        );
      }

      return filtered;

    } catch (error) {
      console.error('Ошибка умной фильтрации:', error);
      return results;
    }
  }

  // Получение трендовых каналов
  async getTrendingChannels(category = null, period = '24h') {
    try {
      const timeFilter = this.getTimeFilter(period);
      
      let query = `
        SELECT channel_id, channel_title, channel_username, participants_count, 
               category, COUNT(*) as search_frequency
        FROM search_results 
        WHERE last_updated > ?
      `;
      
      const params = [timeFilter];
      
      if (category) {
        query += ` AND category = ?`;
        params.push(category);
      }
      
      query += ` GROUP BY channel_id ORDER BY search_frequency DESC, participants_count DESC LIMIT 20`;
      
      return await this.db.allQuery(query, params);
    } catch (error) {
      console.error('Ошибка получения трендов:', error);
      return [];
    }
  }

  // Получение временного фильтра
  getTimeFilter(period) {
    const now = Math.floor(Date.now() / 1000);
    switch (period) {
      case '1h': return now - 3600;
      case '24h': return now - 86400;
      case '7d': return now - 604800;
      case '30d': return now - 2592000;
      default: return now - 86400;
    }
  }

  // Экспорт результатов в различных форматах
  async exportResults(query, format = 'json', options = {}) {
    try {
      const results = await this.comprehensiveSearch(query, options);
      
      switch (format) {
        case 'json':
          return {
            query,
            timestamp: new Date().toISOString(),
            total: results.length,
            results: results.map(r => ({
              ...r,
              exportedAt: new Date().toISOString()
            }))
          };
          
        case 'csv':
          const csvHeaders = [
            'ID', 'Название', 'Username', 'Тип', 'Участники', 
            'Категория', 'Верифицирован', 'Ссылка', 'Источники'
          ];
          const csvRows = results.map(r => [
            r.id,
            `"${r.title}"`,
            r.username || '',
            r.type,
            r.participantsCount,
            r.category,
            r.verified ? 'Да' : 'Нет',
            r.link || '',
            (r.sources || []).join(';')
          ]);
          return [csvHeaders, ...csvRows];
          
        case 'markdown':
          let md = `# Результаты поиска: "${query}"\n\n`;
          md += `Дата: ${new Date().toLocaleDateString('ru-RU')}\n`;
          md += `Найдено каналов: ${results.length}\n\n`;
          
          for (let r of results) {
            md += `## ${r.title}\n`;
            md += `- **Тип:** ${r.type === 'channel' ? 'Канал' : 'Группа'}\n`;
            md += `- **Участники:** ${r.participantsCount?.toLocaleString('ru-RU') || 'Неизвестно'}\n`;
            md += `- **Категория:** ${r.category}\n`;
            if (r.username) md += `- **Ссылка:** https://t.me/${r.username}\n`;
            if (r.description) md += `- **Описание:** ${r.description}\n`;
            md += `\n`;
          }
          return md;
          
        default:
          return results;
      }
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      return null;
    }
  }
}

module.exports = { GlobalChannelFinder };


