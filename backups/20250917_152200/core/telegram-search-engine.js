const { Api } = require('telegram');
const { Database } = require('./database');

class TelegramSearchEngine {
  constructor() {
    this.db = new Database();
    this.client = null;
    this.searchCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 минут
    
    // Категории для классификации каналов
    this.categories = {
      'новости': ['news', 'новости', 'сми', 'медиа', 'лента'],
      'технологии': ['tech', 'технологии', 'ит', 'программирование', 'ai', 'разработка'],
      'бизнес': ['business', 'бизнес', 'предпринимательство', 'стартап', 'инвестиции'],
      'образование': ['education', 'образование', 'курсы', 'обучение', 'знания'],
      'развлечения': ['entertainment', 'развлечения', 'юмор', 'мемы', 'fun'],
      'спорт': ['sport', 'спорт', 'фитнес', 'футбол', 'хоккей'],
      'игры': ['games', 'игры', 'gaming', 'геймер', 'game'],
      'музыка': ['music', 'музыка', 'песни', 'аудио', 'sound'],
      'кино': ['movies', 'кино', 'фильмы', 'сериалы', 'cinema'],
      'путешествия': ['travel', 'путешествия', 'туризм', 'страны', 'города'],
      'кулинария': ['cooking', 'кулинария', 'рецепты', 'еда', 'food'],
      'мода': ['fashion', 'мода', 'стиль', 'одежда', 'beauty'],
      'авто': ['auto', 'авто', 'машины', 'cars', 'мото'],
      'финансы': ['finance', 'финансы', 'криптовалюты', 'инвестиции', 'деньги'],
      'здоровье': ['health', 'здоровье', 'медицина', 'фитнес', 'wellness'],
      'психология': ['psychology', 'психология', 'саморазвитие', 'мотивация'],
      'политика': ['politics', 'политика', 'власть', 'государство', 'выборы'],
      'наука': ['science', 'наука', 'исследования', 'физика', 'химия'],
      'криптовалюты': ['crypto', 'криптовалюты', 'bitcoin', 'блокчейн', 'defi'],
      'недвижимость': ['realestate', 'недвижимость', 'жилье', 'ипотека', 'квартиры']
    };
    
    console.log('🔍 TelegramSearchEngine инициализирован');
  }

  // Инициализация с MTProto клиентом
  async init(mtClient) {
    try {
      this.client = mtClient;
      await this.db.init();
      await this.createSearchTables();
      console.log('✅ TelegramSearchEngine подключен');
    } catch (error) {
      console.error('❌ Ошибка инициализации поисковика:', error);
    }
  }

  // Создание таблиц для поиска
  async createSearchTables() {
    const queries = [
      // Таблица результатов поиска
      `CREATE TABLE IF NOT EXISTS search_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        channel_title TEXT NOT NULL,
        channel_username TEXT,
        channel_type TEXT NOT NULL,
        participants_count INTEGER DEFAULT 0,
        description TEXT,
        category TEXT,
        verified INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        last_updated INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Таблица истории поиска
      `CREATE TABLE IF NOT EXISTS search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        query TEXT NOT NULL,
        results_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Таблица популярных каналов
      `CREATE TABLE IF NOT EXISTS popular_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT UNIQUE NOT NULL,
        channel_title TEXT NOT NULL,
        channel_username TEXT,
        participants_count INTEGER DEFAULT 0,
        category TEXT,
        search_frequency INTEGER DEFAULT 0,
        last_active INTEGER DEFAULT (strftime('%s', 'now'))
      )`
    ];

    for (let query of queries) {
      await this.db.runQuery(query);
    }
  }

  // Основная функция поиска
  async searchChannels(query, options = {}) {
    try {
      const {
        type = 'all', // 'channels', 'groups', 'all'
        limit = 50,
        minParticipants = 0,
        category = null,
        verifiedOnly = false,
        useCache = true
      } = options;

      console.log(`🔍 Поиск каналов по запросу: "${query}"`);

      // Проверяем кэш
      const cacheKey = this.getCacheKey(query, options);
      if (useCache && this.searchCache.has(cacheKey)) {
        const cached = this.searchCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log('📋 Результат из кэша');
          return cached.results;
        }
      }

      // Выполняем поиск через Telegram API
      const results = await this.performTelegramSearch(query, options);
      
      // Фильтруем и обогащаем результаты
      const filteredResults = await this.filterAndEnrichResults(results, options);
      
      // Сохраняем в кэш
      this.searchCache.set(cacheKey, {
        results: filteredResults,
        timestamp: Date.now()
      });

      // Сохраняем результаты в БД
      await this.saveSearchResults(query, filteredResults);

      return filteredResults;

    } catch (error) {
      console.error('❌ Ошибка поиска каналов:', error);
      return [];
    }
  }

  // Выполнение поиска через Telegram API
  async performTelegramSearch(query, options) {
    try {
      const results = [];
      
      // Поиск через глобальный поиск Telegram
      const searchResult = await this.client.invoke(
        new Api.contacts.Search({
          q: query,
          limit: options.limit || 50
        })
      );

      // Обрабатываем результаты
      if (searchResult.chats) {
        for (let chat of searchResult.chats) {
          if (this.isValidChannel(chat, options)) {
            results.push(this.formatChannelResult(chat));
          }
        }
      }

      // Дополнительный поиск через messages.SearchGlobal для более широкого охвата
      try {
        const globalSearch = await this.client.invoke(
          new Api.messages.SearchGlobal({
            q: query,
            offsetRate: 0,
            offsetPeer: new Api.InputPeerEmpty(),
            offsetId: 0,
            limit: Math.min(options.limit || 50, 100)
          })
        );

        if (globalSearch.chats) {
          for (let chat of globalSearch.chats) {
            if (this.isValidChannel(chat, options) && 
                !results.find(r => r.id === chat.id.toString())) {
              results.push(this.formatChannelResult(chat));
            }
          }
        }
      } catch (globalError) {
        console.log('Глобальный поиск недоступен:', globalError.message);
      }

      return results;

    } catch (error) {
      console.error('Ошибка выполнения поиска в Telegram:', error);
      return [];
    }
  }

  // Проверка валидности канала
  isValidChannel(chat, options) {
    // Проверяем тип
    if (options.type === 'channels' && !chat.broadcast) {
      return false;
    }
    if (options.type === 'groups' && chat.broadcast) {
      return false;
    }

    // Проверяем минимальное количество участников
    if (options.minParticipants && 
        (!chat.participantsCount || chat.participantsCount < options.minParticipants)) {
      return false;
    }

    // Проверяем верификацию
    if (options.verifiedOnly && !chat.verified) {
      return false;
    }

    return true;
  }

  // Форматирование результата
  formatChannelResult(chat) {
    return {
      id: chat.id.toString(),
      title: chat.title || 'Без названия',
      username: chat.username || null,
      type: chat.broadcast ? 'channel' : 'group',
      participantsCount: chat.participantsCount || 0,
      description: chat.about || null,
      verified: chat.verified || false,
      photo: chat.photo ? this.formatPhoto(chat.photo) : null,
      category: this.detectCategory(chat.title, chat.about),
      link: chat.username ? `https://t.me/${chat.username}` : null,
      date: chat.date || null
    };
  }

  // Форматирование фото
  formatPhoto(photo) {
    try {
      if (photo && photo.photoId) {
        return {
          id: photo.photoId.toString(),
          hasPhoto: true
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Определение категории канала
  detectCategory(title, description) {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    for (let [category, keywords] of Object.entries(this.categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }
    
    return 'общее';
  }

  // Фильтрация и обогащение результатов
  async filterAndEnrichResults(results, options) {
    let filtered = [...results];

    // Фильтрация по категории
    if (options.category) {
      filtered = filtered.filter(result => result.category === options.category);
    }

    // Сортировка по релевантности
    filtered = this.sortByRelevance(filtered, options.query);

    // Ограничение количества результатов
    if (options.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  // Сортировка по релевантности
  sortByRelevance(results, query) {
    const queryLower = query.toLowerCase();
    
    return results.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Точное совпадение в username
      if (a.username && a.username.toLowerCase().includes(queryLower)) scoreA += 100;
      if (b.username && b.username.toLowerCase().includes(queryLower)) scoreB += 100;

      // Совпадение в начале названия
      if (a.title && a.title.toLowerCase().startsWith(queryLower)) scoreA += 50;
      if (b.title && b.title.toLowerCase().startsWith(queryLower)) scoreB += 50;

      // Совпадение в названии
      if (a.title && a.title.toLowerCase().includes(queryLower)) scoreA += 25;
      if (b.title && b.title.toLowerCase().includes(queryLower)) scoreB += 25;

      // Бонус за количество участников
      scoreA += Math.log10((a.participantsCount || 1) + 1);
      scoreB += Math.log10((b.participantsCount || 1) + 1);

      // Бонус за верификацию
      if (a.verified) scoreA += 10;
      if (b.verified) scoreB += 10;

      return scoreB - scoreA;
    });
  }

  // Сохранение результатов поиска
  async saveSearchResults(query, results) {
    try {
      for (let result of results) {
        await this.db.runQuery(
          `INSERT OR REPLACE INTO search_results 
           (query, channel_id, channel_title, channel_username, channel_type, 
            participants_count, description, category, verified, last_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))`,
          [query, result.id, result.title, result.username, result.type,
           result.participantsCount, result.description, result.category, result.verified ? 1 : 0]
        );
      }
    } catch (error) {
      console.error('Ошибка сохранения результатов:', error);
    }
  }

  // Сохранение истории поиска
  async saveSearchHistory(userId, query, resultsCount) {
    try {
      await this.db.runQuery(
        `INSERT INTO search_history (user_id, query, results_count) VALUES (?, ?, ?)`,
        [userId, query, resultsCount]
      );
    } catch (error) {
      console.error('Ошибка сохранения истории:', error);
    }
  }

  // Получение истории поиска пользователя
  async getUserSearchHistory(userId, limit = 10) {
    try {
      return await this.db.allQuery(
        `SELECT * FROM search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
        [userId, limit]
      );
    } catch (error) {
      console.error('Ошибка получения истории:', error);
      return [];
    }
  }

  // Получение популярных поисковых запросов
  async getPopularQueries(limit = 10) {
    try {
      return await this.db.allQuery(
        `SELECT query, COUNT(*) as count FROM search_history 
         WHERE created_at > strftime('%s', 'now', '-7 days')
         GROUP BY query ORDER BY count DESC LIMIT ?`,
        [limit]
      );
    } catch (error) {
      console.error('Ошибка получения популярных запросов:', error);
      return [];
    }
  }

  // Получение рекомендуемых каналов по категории
  async getRecommendedChannels(category, limit = 10) {
    try {
      return await this.db.allQuery(
        `SELECT DISTINCT channel_id, channel_title, channel_username, participants_count, category
         FROM search_results 
         WHERE category = ? AND participants_count > 1000
         ORDER BY participants_count DESC LIMIT ?`,
        [category, limit]
      );
    } catch (error) {
      console.error('Ошибка получения рекомендаций:', error);
      return [];
    }
  }

  // Поиск похожих каналов
  async findSimilarChannels(channelId, limit = 5) {
    try {
      // Получаем информацию о канале
      const channel = await this.db.getQuery(
        `SELECT * FROM search_results WHERE channel_id = ? LIMIT 1`,
        [channelId]
      );

      if (!channel) return [];

      // Ищем каналы той же категории
      return await this.db.allQuery(
        `SELECT DISTINCT channel_id, channel_title, channel_username, participants_count, category
         FROM search_results 
         WHERE category = ? AND channel_id != ? AND participants_count > 100
         ORDER BY participants_count DESC LIMIT ?`,
        [channel.category, channelId, limit]
      );
    } catch (error) {
      console.error('Ошибка поиска похожих каналов:', error);
      return [];
    }
  }

  // Генерация ключа для кэша
  getCacheKey(query, options) {
    return `${query}_${JSON.stringify(options)}`;
  }

  // Очистка кэша
  clearCache() {
    this.searchCache.clear();
    console.log('🗑️ Кэш поиска очищен');
  }

  // Получение статистики поиска
  getSearchStats() {
    return {
      cacheSize: this.searchCache.size,
      availableCategories: Object.keys(this.categories),
      totalCategories: Object.keys(this.categories).length
    };
  }

  // Поиск каналов по множественным критериям
  async advancedSearch(criteria) {
    try {
      const {
        keywords = [],
        categories = [],
        minParticipants = 0,
        maxParticipants = null,
        verifiedOnly = false,
        hasUsername = false,
        type = 'all',
        limit = 50
      } = criteria;

      let results = [];

      // Поиск по каждому ключевому слову
      for (let keyword of keywords) {
        const keywordResults = await this.searchChannels(keyword, {
          type,
          limit: limit * 2, // Получаем больше для фильтрации
          minParticipants,
          verifiedOnly
        });
        results = results.concat(keywordResults);
      }

      // Удаляем дубликаты
      const unique = new Map();
      results.forEach(result => {
        if (!unique.has(result.id)) {
          unique.set(result.id, result);
        }
      });
      results = Array.from(unique.values());

      // Применяем дополнительные фильтры
      results = results.filter(result => {
        // Фильтр по категориям
        if (categories.length > 0 && !categories.includes(result.category)) {
          return false;
        }

        // Фильтр по максимальному количеству участников
        if (maxParticipants && result.participantsCount > maxParticipants) {
          return false;
        }

        // Фильтр наличия username
        if (hasUsername && !result.username) {
          return false;
        }

        return true;
      });

      // Ограничиваем результат
      return results.slice(0, limit);

    } catch (error) {
      console.error('Ошибка расширенного поиска:', error);
      return [];
    }
  }

  // Экспорт результатов поиска
  async exportSearchResults(query, format = 'json') {
    try {
      const results = await this.db.allQuery(
        `SELECT * FROM search_results WHERE query = ? ORDER BY participants_count DESC`,
        [query]
      );

      if (format === 'json') {
        return {
          query,
          timestamp: Date.now(),
          total: results.length,
          results: results
        };
      }

      if (format === 'csv') {
        const headers = ['ID', 'Название', 'Username', 'Тип', 'Участники', 'Категория', 'Ссылка'];
        const rows = results.map(r => [
          r.channel_id,
          r.channel_title,
          r.channel_username || '',
          r.channel_type,
          r.participants_count,
          r.category,
          r.channel_username ? `https://t.me/${r.channel_username}` : ''
        ]);
        
        return [headers, ...rows];
      }

      return results;

    } catch (error) {
      console.error('Ошибка экспорта результатов:', error);
      return null;
    }
  }
}

module.exports = { TelegramSearchEngine };


