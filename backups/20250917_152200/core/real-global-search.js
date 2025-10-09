/**
 * НАСТОЯЩИЙ ГЛОБАЛЬНЫЙ ПОИСК ПО TELEGRAM
 * 
 * Основан на проверенном скрипте из telegram_parser/global_channel_search.js
 * Ищет ПО ВСЕМУ ТЕЛЕГРАМУ, а не только среди подписок!
 */

const { Api } = require('telegram');

class RealGlobalSearch {
  constructor() {
    this.client = null;
    
    // Конфигурация поиска
    this.config = {
      searchDelay: 1000,        // Задержка между поисками (мс)
      maxResultsPerKeyword: 20, // Максимум результатов на ключевое слово
      minSubscribers: 100,      // Минимум подписчиков  
      maxSubscribers: 10000000, // Максимум подписчиков
      blacklistWords: ['scam', 'fake', 'spam', 'pump', 'dump']
    };
  }

  async init(mtClient) {
    try {
      this.client = mtClient;
      console.log('✅ RealGlobalSearch инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации RealGlobalSearch:', error);
      throw error;
    }
  }

  /**
   * НАСТОЯЩИЙ глобальный поиск по всему Telegram
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Опции поиска
   * @returns {Promise<Array>} Массив найденных каналов
   */
  async searchChannels(query, options = {}) {
    try {
      console.log(`🔍 НАСТОЯЩИЙ глобальный поиск: "${query}"`);
      
      const limit = Math.min(options.limit || this.config.maxResultsPerKeyword, 50);
      
      // ИСПОЛЬЗУЕМ contacts.Search - ищет ПО ВСЕМУ ТЕЛЕГРАМУ!
      const searchResult = await this.client.invoke(
        new Api.contacts.Search({
          q: query,
          limit
        })
      );
      
      console.log(`📊 Найдено чатов: ${searchResult.chats?.length || 0}`);
      
      const results = [];
      
      if (searchResult.chats && searchResult.chats.length > 0) {
        for (const chat of searchResult.chats) {
          if (this.isValidChannel(chat, options)) {
            const formatted = this.formatChannelResult(chat, query);
            results.push(formatted);
            console.log(`✅ Добавлен: ${formatted.title} (${formatted.participantsCount} участников)`);
          }
        }
      }
      
      // Фильтруем по метрикам
      const filtered = this.filterByMetrics(results);
      console.log(`🎯 После фильтрации: ${filtered.length} каналов`);
      
      return filtered;
      
    } catch (error) {
      console.error('❌ Ошибка глобального поиска:', error);
      return [];
    }
  }

  /**
   * Проверяет валидность канала
   */
  isValidChannel(chat, options = {}) {
    // Должен быть каналом или группой
    if (chat.className !== 'Channel' && chat.className !== 'Chat') {
      return false;
    }

    // Должен быть публичным или иметь участников
    if (!chat.username && (!chat.participantsCount || chat.participantsCount === 0)) {
      return false;
    }

    // Не должен быть удален
    if (chat.deactivated || chat.forbidden) {
      return false;
    }

    return true;
  }

  /**
   * Форматирует результат канала
   */
  formatChannelResult(chat, foundBy) {
    return {
      id: chat.id.toString(),
      title: chat.title || 'Без названия',
      username: chat.username || null,
      participantsCount: chat.participantsCount || 0,
      description: chat.about || '',
      type: chat.className === 'Channel' ? 'channel' : 'group',
      category: this.categorizeChannel(chat.title, chat.about),
      foundBy: foundBy,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Категоризирует канал по названию и описанию
   */
  categorizeChannel(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.match(/крипт|crypto|bitcoin|btc|eth|trading|сигнал|signal/)) {
      return 'криптовалюты';
    }
    if (text.match(/новости|news|рбк|лента|тасс/)) {
      return 'новости';
    }
    if (text.match(/технолог|tech|программ|ai|it|разработ/)) {
      return 'технологии';
    }
    if (text.match(/бизнес|business|стартап|startup|инвест/)) {
      return 'бизнес';
    }
    if (text.match(/гороскоп|астролог|зодиак|horoscope|astro/)) {
      return 'астрология';
    }
    
    return 'общее';
  }

  /**
   * Фильтрует каналы по метрикам
   */
  filterByMetrics(channels) {
    return channels.filter(channel => {
      const participants = channel.participantsCount || 0;
      
      // Проверяем количество подписчиков
      if (participants < this.config.minSubscribers || 
          participants > this.config.maxSubscribers) {
        return false;
      }
      
      // Проверяем на запрещенные слова
      const titleLower = (channel.title || '').toLowerCase();
      const descLower = (channel.description || '').toLowerCase();
      
      for (const blackWord of this.config.blacklistWords) {
        if (titleLower.includes(blackWord) || descLower.includes(blackWord)) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Поиск с несколькими ключевыми словами
   */
  async searchMultipleKeywords(keywords, theme = 'general') {
    console.log(`🔍 Поиск по теме "${theme}" с ${keywords.length} ключевыми словами`);
    
    const allResults = [];
    
    for (const keyword of keywords) {
      try {
        const results = await this.searchChannels(keyword);
        allResults.push(...results);
        
        // Задержка между поисками
        if (keywords.indexOf(keyword) < keywords.length - 1) {
          await this.delay(this.config.searchDelay);
        }
        
      } catch (error) {
        console.error(`⚠️ Ошибка поиска по "${keyword}":`, error.message);
      }
    }
    
    // Убираем дубликаты
    const unique = this.removeDuplicates(allResults);
    console.log(`📊 Найдено ${unique.length} уникальных каналов по теме "${theme}"`);
    
    return unique;
  }

  /**
   * Убирает дубликаты
   */
  removeDuplicates(channels) {
    const seen = new Set();
    return channels.filter(channel => {
      const key = channel.id || channel.username || channel.title;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Задержка
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Форматирует результаты для отправки в чат
   */
  formatResultsForChat(channels, query) {
    if (!channels || channels.length === 0) {
      return `❌ По запросу "${query}" ничего не найдено.\n\n💡 Попробуйте:\n• Изменить запрос\n• Использовать синонимы\n• Поиск на английском языке`;
    }

    let message = `🔍 Найдено ${channels.length} каналов по запросу "${query}":\n\n`;
    
    channels.slice(0, 10).forEach((channel, index) => {
      message += `${index + 1}. 📺 **${channel.title}**\n`;
      if (channel.username) {
        message += `   🔗 @${channel.username}\n`;
      }
      message += `   👥 ${channel.participantsCount.toLocaleString()} участников\n`;
      message += `   🏷️ ${channel.category}\n`;
      if (channel.description && channel.description.length > 0) {
        const desc = channel.description.length > 100 
          ? channel.description.substring(0, 100) + '...'
          : channel.description;
        message += `   📝 ${desc}\n`;
      }
      message += '\n';
    });

    if (channels.length > 10) {
      message += `\n... и еще ${channels.length - 10} каналов`;
    }

    return message;
  }
}

module.exports = RealGlobalSearch;
