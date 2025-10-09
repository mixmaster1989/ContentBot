/**
 * AI АНАЛИЗАТОР КАНАЛОВ TELEGRAM
 * 
 * Использует LLM_API для умного анализа каналов и вынесения вердиктов
 * Собирает расширенные метрики и оценивает качество контента
 */

const axios = require('axios');

class AIChannelAnalyzer {
  constructor() {
    // Cloud.ru API настройки (как в проекте)
    this.config = {
      apiKey: process.env.LLM_API,
      baseUrl: 'https://foundation-models.api.cloud.ru/v1',
      model: 'openai/gpt-oss-120b',
      maxTokens: 4000,
      temperature: 0.3 // Низкая температура для точных оценок
    };
    
    this.client = null;
  }

  async init(telegramClient) {
    try {
      this.client = telegramClient;
      
      // Проверяем доступность LLM API
      if (!this.config.apiKey) {
        throw new Error('LLM_API ключ не настроен в .env');
      }
      
      console.log('✅ AI анализатор каналов инициализирован');
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка инициализации AI анализатора:', error);
      throw error;
    }
  }

  /**
   * Анализирует канал с помощью AI и собирает метрики
   * @param {Object} channel - Объект канала из поиска
   * @returns {Promise<Object>} Расширенный объект канала с AI анализом
   */
  async analyzeChannel(channel) {
    try {
      console.log(`🧠 AI анализ канала: ${channel.title}`);
      
      // Собираем расширенные метрики
      const metrics = await this.collectChannelMetrics(channel);
      
      // Получаем последние сообщения для анализа контента
      const recentMessages = await this.getRecentMessages(channel);
      
      // Анализируем контент с помощью AI
      const aiAnalysis = await this.performAIAnalysis(channel, recentMessages, metrics);
      
      // Объединяем все данные
      const enrichedChannel = {
        ...channel,
        metrics: metrics,
        aiAnalysis: aiAnalysis,
        analyzedAt: new Date().toISOString()
      };
      
      console.log(`✅ AI анализ завершен для: ${channel.title}`);
      return enrichedChannel;
      
    } catch (error) {
      console.error(`❌ Ошибка AI анализа канала ${channel.title}:`, error);
      
      // Возвращаем канал с базовой информацией об ошибке
      return {
        ...channel,
        metrics: await this.collectBasicMetrics(channel),
        aiAnalysis: {
          error: error.message,
          qualityScore: 0,
          verdict: 'Анализ недоступен'
        },
        analyzedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Собирает расширенные метрики канала
   */
  async collectChannelMetrics(channel) {
    try {
      const metrics = {
        // Базовые метрики
        subscribersCount: channel.participantsCount || 0,
        type: channel.type,
        hasUsername: !!channel.username,
        
        // Расширенные метрики (будем собирать)
        avgPostsPerDay: 0,
        avgViewsPerPost: 0,
        avgReactionsPerPost: 0,
        lastPostDate: null,
        postsAnalyzed: 0,
        avgPostLength: 0,
        mediaPercentage: 0,
        forwardPercentage: 0,
        
        // Временные метки
        collectedAt: new Date().toISOString()
      };

      // Если есть доступ к каналу - собираем детальные метрики
      if (this.client && channel.username) {
        const detailedMetrics = await this.getDetailedMetrics(channel);
        Object.assign(metrics, detailedMetrics);
      }

      return metrics;
      
    } catch (error) {
      console.error('Ошибка сбора метрик:', error);
      return this.collectBasicMetrics(channel);
    }
  }

  /**
   * Собирает базовые метрики при ошибке
   */
  async collectBasicMetrics(channel) {
    return {
      subscribersCount: channel.participantsCount || 0,
      type: channel.type,
      hasUsername: !!channel.username,
      collectedAt: new Date().toISOString(),
      error: 'Детальные метрики недоступны'
    };
  }

  /**
   * Получает детальные метрики канала через Telegram API
   */
  async getDetailedMetrics(channel) {
    try {
      const identifier = channel.username || channel.id;
      console.log(`📊 Собираю метрики для ${channel.username ? '@' + channel.username : 'ID:' + channel.id}...`);
      
      // Получаем последние 50 сообщений для анализа
      const messages = await this.client.getMessages(identifier, { limit: 50 });
      
      console.log(`📊 Получено ${messages.length} сообщений для метрик`);
      
      if (!messages || messages.length === 0) {
        console.log(`❌ Нет сообщений для метрик в @${channel.username}`);
        return { postsAnalyzed: 0 };
      }

      let totalViews = 0;
      let totalReactions = 0;
      let totalLength = 0;
      let mediaCount = 0;
      let forwardCount = 0;
      let validMessages = 0;

      const now = new Date();
      const oldestMessage = messages[messages.length - 1];
      const daysDiff = oldestMessage ? (now - new Date(oldestMessage.date * 1000)) / (1000 * 60 * 60 * 24) : 1;

      for (const message of messages) {
        if (!message.message && !message.media) continue;
        
        validMessages++;
        
        // Просмотры
        if (message.views) totalViews += message.views;
        
        // Реакции
        if (message.reactions) {
          const reactions = message.reactions.results || [];
          totalReactions += reactions.reduce((sum, r) => sum + r.count, 0);
        }
        
        // Длина текста
        if (message.message) totalLength += message.message.length;
        
        // Медиа
        if (message.media) mediaCount++;
        
        // Пересылки
        if (message.fwdFrom) forwardCount++;
      }

      const metrics = {
        postsAnalyzed: validMessages,
        avgPostsPerDay: validMessages / Math.max(daysDiff, 1),
        avgViewsPerPost: validMessages > 0 ? Math.round(totalViews / validMessages) : 0,
        avgReactionsPerPost: validMessages > 0 ? Math.round(totalReactions / validMessages) : 0,
        avgPostLength: validMessages > 0 ? Math.round(totalLength / validMessages) : 0,
        mediaPercentage: validMessages > 0 ? Math.round((mediaCount / validMessages) * 100) : 0,
        forwardPercentage: validMessages > 0 ? Math.round((forwardCount / validMessages) * 100) : 0,
        lastPostDate: messages[0]?.date ? new Date(messages[0].date * 1000).toISOString() : null
      };

      console.log(`✅ Метрики собраны: ${validMessages} постов, ${metrics.avgViewsPerPost} просмотров`);
      return metrics;
      
    } catch (error) {
      console.error(`❌ Ошибка получения метрик из @${channel.username}:`, error.message);
      return { postsAnalyzed: 0, error: error.message };
    }
  }

  /**
   * Получает последние сообщения канала для AI анализа
   */
  async getRecentMessages(channel) {
    try {
      if (!this.client || (!channel.username && !channel.id)) {
        console.log(`❌ Нет клиента или идентификатора для канала ${channel.title}`);
        return [];
      }

      const identifier = channel.username || channel.id;
      console.log(`📨 Получаю сообщения из ${channel.username ? '@' + channel.username : 'ID:' + channel.id}...`);
      const messages = await this.client.getMessages(identifier, { limit: 50 });
      
      console.log(`📊 Получено ${messages.length} сообщений из ${channel.username ? '@' + channel.username : 'ID:' + channel.id}`);
      
      if (!messages || messages.length === 0) {
        console.log(`❌ Нет сообщений в ${channel.username ? '@' + channel.username : 'ID:' + channel.id}`);
        return [];
      }
      
      const filteredMessages = messages
        .filter(msg => msg.message && msg.message.length > 20)
        .slice(0, 5)
        .map(msg => ({
          text: msg.message.substring(0, 500), // Ограничиваем длину
          date: msg.date, // Keep as Unix timestamp for now
          views: msg.views || 0,
          reactions: msg.reactions || null,
          media: msg.media ? true : false,
          fwdFrom: msg.fwdFrom ? true : false
        }));
        
      console.log(`✅ Отфильтровано ${filteredMessages.length} сообщений для анализа`);
      return filteredMessages;
        
    } catch (error) {
      console.error(`❌ Ошибка получения сообщений из ${channel.username ? '@' + channel.username : 'ID:' + channel.id}:`, error.message);
      return [];
    }
  }

  /**
   * Выполняет AI анализ канала
   */
  async performAIAnalysis(channel, messages, metrics) {
    try {
      const prompt = this.buildAnalysisPrompt(channel, messages, metrics);
      
      const response = await this.callLLMAPI(prompt);
      
      if (!response) {
        throw new Error('Пустой ответ от LLM API');
      }

      // Парсим ответ AI
      return this.parseAIResponse(response);
      
    } catch (error) {
      console.error('Ошибка AI анализа:', error);
      return {
        error: error.message,
        qualityScore: 0,
        verdict: 'Анализ недоступен',
        categories: [],
        warnings: ['Ошибка AI анализа']
      };
    }
  }

  /**
   * Формирует промпт для AI анализа
   */
  buildAnalysisPrompt(channel, messages, metrics) {
    const prompt = `Проанализируй Telegram канал и дай оценку его качества.

ИНФОРМАЦИЯ О КАНАЛЕ:
- Название: ${channel.title}
- Описание: ${channel.description || 'Не указано'}
- Подписчиков: ${metrics.subscribersCount}
- Username: ${channel.username || 'Не указан'}
- Тип: ${channel.type}

МЕТРИКИ:
- Постов проанализировано: ${metrics.postsAnalyzed || 0}
- Средний пост в день: ${metrics.avgPostsPerDay || 0}
- Средние просмотры: ${metrics.avgViewsPerPost || 0}
- Процент медиа: ${metrics.mediaPercentage || 0}%
- Процент пересылок: ${metrics.forwardPercentage || 0}%

ПОСЛЕДНИЕ СООБЩЕНИЯ:
${messages.map((msg, i) => `${i+1}. ${msg.text.substring(0, 200)}...`).join('\n')}

ЗАДАЧА:
Проанализируй канал и верни JSON с оценкой:

{
  "qualityScore": число от 0 до 10,
  "verdict": "краткий вердикт (полезный/спам/реклама/образовательный/новости)",
  "categories": ["список категорий контента"],
  "commercialIndex": число от 0 до 10 (коммерческая направленность),
  "educationalValue": число от 0 до 10 (образовательная ценность),
  "contentType": "тип контента (оригинальный/репосты/смешанный)",
  "targetAudience": "целевая аудитория",
  "warnings": ["список предупреждений если есть"],
  "recommendation": "рекомендация подписаться или нет"
}

Отвечай ТОЛЬКО JSON без дополнительного текста.`;

    return prompt;
  }

  /**
   * Вызывает LLM API
   */
  async callLLMAPI(prompt) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/chat/completions`,
        {
          model: this.config.model,
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content.trim();
      
    } catch (error) {
      console.error('LLM API ошибка:', error.response?.data || error.message);
      throw new Error(`LLM API недоступен: ${error.message}`);
    }
  }

  /**
   * Парсит ответ AI в структурированный объект
   */
  parseAIResponse(response) {
    try {
      // Убираем возможные markdown блоки
      const cleanResponse = response.replace(/```json\n?|```\n?/g, '').trim();
      
      const parsed = JSON.parse(cleanResponse);
      
      // Валидируем обязательные поля
      return {
        qualityScore: Math.max(0, Math.min(10, parsed.qualityScore || 0)),
        verdict: parsed.verdict || 'Неопределено',
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        commercialIndex: Math.max(0, Math.min(10, parsed.commercialIndex || 0)),
        educationalValue: Math.max(0, Math.min(10, parsed.educationalValue || 0)),
        contentType: parsed.contentType || 'Неизвестно',
        targetAudience: parsed.targetAudience || 'Не определена',
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
        recommendation: parsed.recommendation || 'Требует дополнительного анализа'
      };
      
    } catch (error) {
      console.error('Ошибка парсинга AI ответа:', error);
      
      // Возвращаем базовую структуру
      return {
        qualityScore: 5,
        verdict: 'Ошибка анализа',
        categories: ['Неопределено'],
        commercialIndex: 0,
        educationalValue: 0,
        contentType: 'Неизвестно',
        targetAudience: 'Не определена',
        warnings: ['Ошибка парсинга AI ответа'],
        recommendation: 'Требует ручной проверки',
        rawResponse: response.substring(0, 200)
      };
    }
  }

  /**
   * Пакетный анализ нескольких каналов
   */
  async analyzeChannelsBatch(channels, options = {}) {
    console.log(`🧠 Запуск пакетного AI анализа ${channels.length} каналов`);
    
    const results = [];
    const delay = options.delay || 2000; // Задержка между запросами
    
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i];
      
      try {
        console.log(`📊 Анализ ${i + 1}/${channels.length}: ${channel.title}`);
        
        const analyzed = await this.analyzeChannel(channel);
        results.push(analyzed);
        
        // Задержка между запросами к API
        if (i < channels.length - 1) {
          await this.delay(delay);
        }
        
      } catch (error) {
        console.error(`❌ Ошибка анализа канала ${channel.title}:`, error);
        results.push({
          ...channel,
          aiAnalysis: { error: error.message, qualityScore: 0 }
        });
      }
    }
    
    console.log(`✅ Пакетный анализ завершен: ${results.length} каналов`);
    return results;
  }

  /**
   * Задержка
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Получает краткую сводку анализа для отображения
   */
  formatAnalysisForDisplay(analysis) {
    if (analysis.error) {
      return `❌ Анализ недоступен`;
    }

    const score = analysis.qualityScore;
    const scoreEmoji = score >= 8 ? '🌟' : score >= 6 ? '⭐' : score >= 4 ? '🔶' : '🔸';
    
    return `${scoreEmoji} ${score}/10 | ${analysis.verdict} | ${analysis.recommendation}`;
  }
}

module.exports = AIChannelAnalyzer;
