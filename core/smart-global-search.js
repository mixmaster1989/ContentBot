/**
 * УМНЫЙ ГЛОБАЛЬНЫЙ ПОИСК С AI АНАЛИЗОМ
 * 
 * Интегрирует RealGlobalSearch с AIChannelAnalyzer
 * Предоставляет умную аналитику каналов с AI вердиктами
 */

const RealGlobalSearch = require('./real-global-search');
const AIChannelAnalyzer = require('./ai-channel-analyzer');

class SmartGlobalSearch extends RealGlobalSearch {
  constructor() {
    super();
    this.aiAnalyzer = new AIChannelAnalyzer();
    this.analysisCache = new Map(); // Кэш AI анализов
  }

  async init(mtClient) {
    try {
      await super.init(mtClient);
      await this.aiAnalyzer.init(mtClient);
      console.log('✅ SmartGlobalSearch с AI анализом инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации SmartGlobalSearch:', error);
      throw error;
    }
  }

  /**
   * Умный поиск каналов с AI анализом
   * @param {string} query - Поисковый запрос
   * @param {Object} options - Опции поиска
   * @returns {Promise<Array>} Массив каналов с AI анализом
   */
  async smartSearch(query, options = {}) {
    try {
      console.log(`🧠 Умный поиск с AI анализом: "${query}"`);
      
      // Выполняем базовый поиск
      const basicResults = await this.searchChannels(query, options);
      
      if (basicResults.length === 0) {
        return [];
      }
      
      console.log(`🔍 Найдено ${basicResults.length} каналов, запускаю AI анализ...`);
      
      // Анализируем каналы с AI (с ограничением для производительности)
      const channelsToAnalyze = basicResults.slice(0, options.aiAnalysisLimit || 10);
      const analyzedChannels = await this.analyzeChannelsWithAI(channelsToAnalyze, options);
      
      // Сортируем по AI рейтингу
      const sortedChannels = this.sortByAIRating(analyzedChannels);
      
      console.log(`✅ Умный поиск завершен: ${sortedChannels.length} каналов проанализировано`);
      return sortedChannels;
      
    } catch (error) {
      console.error('❌ Ошибка умного поиска:', error);
      // Возвращаем базовые результаты без AI анализа
      return await this.searchChannels(query, options);
    }
  }

  /**
   * Анализирует каналы с помощью AI
   */
  async analyzeChannelsWithAI(channels, options = {}) {
    const analyzedChannels = [];
    
    for (const channel of channels) {
      try {
        // Проверяем кэш
        const cacheKey = `${channel.id}_${channel.title}`;
        if (this.analysisCache.has(cacheKey)) {
          console.log(`📝 Используем кэш AI анализа для: ${channel.title}`);
          analyzedChannels.push(this.analysisCache.get(cacheKey));
          continue;
        }
        
        // Выполняем AI анализ
        const analyzedChannel = await this.aiAnalyzer.analyzeChannel(channel);
        
        // Сохраняем в кэш
        this.analysisCache.set(cacheKey, analyzedChannel);
        
        analyzedChannels.push(analyzedChannel);
        
        // Задержка между анализами
        if (options.analysisDelay !== false) {
          await this.delay(options.analysisDelay || 1500);
        }
        
      } catch (error) {
        console.error(`❌ Ошибка AI анализа канала ${channel.title}:`, error);
        
        // Добавляем канал с базовой информацией
        analyzedChannels.push({
          ...channel,
          aiAnalysis: {
            error: error.message,
            qualityScore: 0,
            verdict: 'Анализ недоступен'
          }
        });
      }
    }
    
    return analyzedChannels;
  }

  /**
   * Сортирует каналы по AI рейтингу
   */
  sortByAIRating(channels) {
    return channels.sort((a, b) => {
      const scoreA = a.aiAnalysis?.qualityScore || 0;
      const scoreB = b.aiAnalysis?.qualityScore || 0;
      
      // Первичная сортировка по AI рейтингу
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // Вторичная сортировка по количеству подписчиков
      const subsA = a.participantsCount || 0;
      const subsB = b.participantsCount || 0;
      return subsB - subsA;
    });
  }

  /**
   * Быстрый поиск без AI анализа
   */
  async quickSearch(query, options = {}) {
    console.log(`⚡ Быстрый поиск: "${query}"`);
    return await this.searchChannels(query, options);
  }

  /**
   * Форматирует результаты с AI анализом для отправки в чат (КАК В ТЕСТЕ!)
   */
  formatResultsForChat(channels, query) {
    if (!channels || channels.length === 0) {
      return `❌ По запросу "${query}" ничего не найдено.\n\n💡 Попробуйте:\n• Изменить запрос\n• Использовать синонимы\n• Поиск на английском языке`;
    }

    let message = `🧠 Умный поиск нашел ${channels.length} каналов по запросу "${query}":\n\n`;
    
    channels.forEach((channel, index) => {
      message += `${index + 1}. 📺 ${channel.title}\n`;
      message += `   👥 ${channel.participantsCount} участников\n`;
      
      // Показываем собранные метрики (КАК В ТЕСТЕ!)
      const metrics = channel.metrics;
      if (metrics) {
        message += `   📊 МЕТРИКИ:\n`;
        message += `      👥 Подписчиков: ${metrics.subscribersCount?.toLocaleString() || 'неизвестно'}\n`;
        message += `      📝 Постов проанализировано: ${metrics.postsAnalyzed || 0}\n`;
        message += `      📈 Постов в день: ${metrics.avgPostsPerDay?.toFixed(1) || 0}\n`;
        message += `      👀 Средние просмотры: ${metrics.avgViewsPerPost || 0}\n`;
        message += `      ❤️ Средние реакции: ${metrics.avgReactionsPerPost || 0}\n`;
        message += `      📏 Средняя длина поста: ${metrics.avgPostLength || 0} символов\n`;
        message += `      🖼️ Медиа контент: ${metrics.mediaPercentage || 0}%\n`;
        message += `      🔄 Пересылки: ${metrics.forwardPercentage || 0}%\n`;
        if (metrics.lastPostDate) {
          message += `      🕒 Последний пост: ${new Date(metrics.lastPostDate).toLocaleDateString()}\n`;
        }
        message += `\n`;
      }

      // AI анализ (КАК В ТЕСТЕ!)
      const analysis = channel.aiAnalysis;
      if (analysis && !analysis.error) {
        const scoreEmoji = analysis.qualityScore >= 8 ? '🌟' : 
                          analysis.qualityScore >= 6 ? '⭐' : 
                          analysis.qualityScore >= 4 ? '🔶' : '🔸';
        
        message += `   ${scoreEmoji} AI Рейтинг: ${analysis.qualityScore}/10\n`;
        message += `   🎯 Вердикт: ${analysis.verdict}\n`;
        message += `   📚 Образовательная ценность: ${analysis.educationalValue}/10\n`;
        message += `   💰 Коммерческий индекс: ${analysis.commercialIndex}/10\n`;
        message += `   📝 Тип контента: ${analysis.contentType}\n`;
        message += `   👥 Аудитория: ${analysis.targetAudience}\n`;
        message += `   💭 Рекомендация: ${analysis.recommendation}\n`;
        
        if (analysis.warnings && analysis.warnings.length > 0) {
          message += `   ⚠️ Предупреждения: ${analysis.warnings.join(', ')}\n`;
        }
      } else {
        message += `   ❌ AI анализ: ${analysis?.error || 'Недоступен'}\n`;
      }
      
      if (channel.username) message += `   🔗 @${channel.username}\n`;
      message += `\n`;
    });

    return message;
  }

  /**
   * Форматирует результаты с AI анализом для отправки в чат
   */
  formatSmartResultsForChat(channels, query) {
    if (!channels || channels.length === 0) {
      return `❌ По запросу "${query}" ничего не найдено.\n\n💡 Попробуйте:\n• Изменить запрос\n• Использовать синонимы\n• Поиск на английском языке`;
    }

    let message = `🧠 Умный поиск нашел ${channels.length} каналов по запросу "${query}":\n\n`;
    
    channels.slice(0, 8).forEach((channel, index) => {
      const analysis = channel.aiAnalysis;
      
      message += `${index + 1}. 📺 **${channel.title}**\n`;
      
      if (channel.username) {
        message += `   🔗 @${channel.username}\n`;
      }
      
      message += `   👥 ${channel.participantsCount.toLocaleString()} участников\n`;
      
      // AI анализ
      if (analysis && !analysis.error) {
        const scoreEmoji = analysis.qualityScore >= 8 ? '🌟' : 
                          analysis.qualityScore >= 6 ? '⭐' : 
                          analysis.qualityScore >= 4 ? '🔶' : '🔸';
        
        message += `   ${scoreEmoji} **AI Рейтинг: ${analysis.qualityScore}/10**\n`;
        message += `   🎯 ${analysis.verdict}\n`;
        
        if (analysis.categories && analysis.categories.length > 0) {
          message += `   🏷️ ${analysis.categories.slice(0, 2).join(', ')}\n`;
        }
        
        if (analysis.educationalValue > 7) {
          message += `   📚 Высокая образовательная ценность\n`;
        }
        
        if (analysis.commercialIndex > 7) {
          message += `   💰 Коммерческий контент\n`;
        }
        
        if (analysis.warnings && analysis.warnings.length > 0) {
          message += `   ⚠️ ${analysis.warnings[0]}\n`;
        }
        
        message += `   💭 *${analysis.recommendation}*\n`;
        
      } else {
        message += `   🏷️ ${channel.category}\n`;
        if (analysis?.error) {
          message += `   ⚠️ AI анализ недоступен\n`;
        }
      }
      
      message += `\n`;
    });

    if (channels.length > 8) {
      message += `\n... и еще ${channels.length - 8} каналов`;
    }

    // Добавляем сводку AI анализа
    const analyzed = channels.filter(c => c.aiAnalysis && !c.aiAnalysis.error);
    if (analyzed.length > 0) {
      const avgScore = analyzed.reduce((sum, c) => sum + c.aiAnalysis.qualityScore, 0) / analyzed.length;
      message += `\n\n📊 **AI Сводка:**\n`;
      message += `🎯 Проанализировано: ${analyzed.length} каналов\n`;
      message += `⭐ Средний рейтинг: ${avgScore.toFixed(1)}/10\n`;
      
      const highQuality = analyzed.filter(c => c.aiAnalysis.qualityScore >= 7).length;
      if (highQuality > 0) {
        message += `🌟 Высокое качество: ${highQuality} каналов\n`;
      }
    }

    return message;
  }

  /**
   * Фильтрует каналы по AI критериям
   */
  filterByAICriteria(channels, criteria = {}) {
    return channels.filter(channel => {
      const analysis = channel.aiAnalysis;
      if (!analysis || analysis.error) return true; // Оставляем неанализированные
      
      // Минимальный рейтинг качества
      if (criteria.minQualityScore && analysis.qualityScore < criteria.minQualityScore) {
        return false;
      }
      
      // Максимальный коммерческий индекс
      if (criteria.maxCommercialIndex && analysis.commercialIndex > criteria.maxCommercialIndex) {
        return false;
      }
      
      // Минимальная образовательная ценность
      if (criteria.minEducationalValue && analysis.educationalValue < criteria.minEducationalValue) {
        return false;
      }
      
      // Исключаем каналы с предупреждениями
      if (criteria.excludeWarnings && analysis.warnings && analysis.warnings.length > 0) {
        return false;
      }
      
      // Фильтр по типу контента
      if (criteria.contentTypes && !criteria.contentTypes.includes(analysis.contentType)) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Получает статистику AI анализа
   */
  getAIAnalysisStats(channels) {
    const analyzed = channels.filter(c => c.aiAnalysis && !c.aiAnalysis.error);
    
    if (analyzed.length === 0) {
      return { analyzed: 0, avgScore: 0 };
    }
    
    const scores = analyzed.map(c => c.aiAnalysis.qualityScore);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const stats = {
      total: channels.length,
      analyzed: analyzed.length,
      avgScore: Math.round(avgScore * 10) / 10,
      highQuality: analyzed.filter(c => c.aiAnalysis.qualityScore >= 7).length,
      educational: analyzed.filter(c => c.aiAnalysis.educationalValue >= 7).length,
      commercial: analyzed.filter(c => c.aiAnalysis.commercialIndex >= 7).length,
      withWarnings: analyzed.filter(c => c.aiAnalysis.warnings && c.aiAnalysis.warnings.length > 0).length
    };
    
    return stats;
  }
}

module.exports = SmartGlobalSearch;
