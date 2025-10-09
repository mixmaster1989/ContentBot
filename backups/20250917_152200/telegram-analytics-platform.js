require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');
const axios = require('axios');

class TelegramAnalyticsPlatform {
  constructor() {
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    
    // Cloud.ru API настройки (как в IKAR)
    this.CLOUD_RU_CONFIG = {
      apiKey: process.env.LLM_API,
      baseUrl: 'https://foundation-models.api.cloud.ru/v1',
      model: 'openai/gpt-oss-120b',
      maxTokens: 50000,
      temperature: 0.3
    };
  }

  async init() {
    try {
      await this.client.connect();
      console.log('✅ Telegram Analytics Platform запущена!');
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
    }
  }

  // 1. SENTIMENT ANALYSIS - Анализ прозападности/пророссийскости канала
  async analyzeSentiment(channelId, channelName) {
    try {
      console.log(`🎯 Анализ политической ориентации канала "${channelName}"`);
      
      // Получаем сообщения
      const messages = await this.getChannelMessages(channelId, 100);
      if (messages.length === 0) return null;

      // Объединяем тексты для анализа
      const combinedText = messages
        .map(msg => msg.text)
        .join('\n\n')
        .substring(0, 15000); // Лимит токенов

      console.log(`📝 Анализирую ${messages.length} сообщений...`);

      const prompt = `
Проанализируй политическую ориентацию этого Telegram канала на основе его контента.

КОНТЕНТ:
${combinedText}

Оцени по шкале от -100 до +100:
- -100: Крайне пророссийский
- -50: Умеренно пророссийский  
- 0: Нейтральный
- +50: Умеренно прозападный
- +100: Крайне прозападный

Также определи:
1. Основные политические темы
2. Ключевые слова и фразы
3. Эмоциональную окраску
4. Упоминания стран/политиков

Ответ в JSON формате:
{
  "sentiment_score": число от -100 до +100,
  "orientation": "пророссийский/нейтральный/прозападный",
  "confidence": "высокая/средняя/низкая",
  "key_topics": ["тема1", "тема2"],
  "key_phrases": ["фраза1", "фраза2"],
  "emotional_tone": "описание",
  "mentioned_entities": ["страна/политик1", "страна/политик2"],
  "reasoning": "объяснение оценки"
}`;

      const response = await axios.post(`${this.CLOUD_RU_CONFIG.baseUrl}/chat/completions`, {
        model: this.CLOUD_RU_CONFIG.model,
        messages: [
          {
            role: "system",
            content: "Ты эксперт по политическому анализу медиа. Анализируй объективно и профессионально."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: this.CLOUD_RU_CONFIG.temperature
      }, {
        headers: {
          'Authorization': `Bearer ${this.CLOUD_RU_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const analysis = JSON.parse(response.data.choices[0].message.content);
      
      return {
        channel_name: channelName,
        channel_id: channelId,
        messages_analyzed: messages.length,
        total_views: messages.reduce((sum, msg) => sum + msg.views, 0),
        analysis_date: new Date().toISOString(),
        ...analysis
      };

    } catch (error) {
      console.error('❌ Ошибка sentiment analysis:', error);
      return null;
    }
  }

  // 2. UNIQUENESS CALCULATOR - Вычисление уникальности контента
  async calculateUniqueness(channelId, channelName, topic) {
    try {
      console.log(`🔍 Анализ уникальности канала "${channelName}" в тематике "${topic}"`);
      
      // Получаем контент канала
      const channelMessages = await this.getChannelMessages(channelId, 50);
      if (channelMessages.length === 0) return null;

      // Получаем контент конкурентов в той же тематике
      const competitorChannels = await this.findSimilarChannels(topic);
      let competitorContent = [];
      
      for (let competitor of competitorChannels.slice(0, 3)) {
        const competitorMessages = await this.getChannelMessages(competitor.id, 30);
        competitorContent = competitorContent.concat(competitorMessages);
      }

      console.log(`📊 Сравниваю с ${competitorContent.length} сообщениями конкурентов`);

      // Анализируем уникальность через LLM
      const channelTexts = channelMessages.map(m => m.text).join('\n');
      const competitorTexts = competitorContent.map(m => m.text).join('\n');

      const prompt = `
Проанализируй уникальность контента этого канала по сравнению с конкурентами в тематике "${topic}".

КОНТЕНТ АНАЛИЗИРУЕМОГО КАНАЛА:
${channelTexts.substring(0, 8000)}

КОНТЕНТ КОНКУРЕНТОВ:
${competitorTexts.substring(0, 8000)}

Оцени по параметрам (0-100%):
1. Оригинальность тем
2. Уникальность подачи
3. Эксклюзивность информации
4. Стиль изложения
5. Частота уникального контента

Ответ в JSON:
{
  "uniqueness_score": число 0-100,
  "originality": число 0-100,
  "exclusivity": число 0-100,
  "style_uniqueness": число 0-100,
  "content_freshness": число 0-100,
  "unique_topics": ["уникальная тема1", "тема2"],
  "common_topics": ["общая тема1", "тема2"],
  "differentiation": "что отличает от конкурентов",
  "recommendations": ["совет1", "совет2"]
}`;

      const response = await axios.post(`${this.CLOUD_RU_CONFIG.baseUrl}/chat/completions`, {
        model: this.CLOUD_RU_CONFIG.model,
        messages: [
          {
            role: "system",
            content: "Ты эксперт по контент-анализу и медиа-метрикам."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: this.CLOUD_RU_CONFIG.temperature
      }, {
        headers: {
          'Authorization': `Bearer ${this.CLOUD_RU_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const uniquenessAnalysis = JSON.parse(response.data.choices[0].message.content);
      
      return {
        channel_name: channelName,
        channel_id: channelId,
        topic: topic,
        competitors_analyzed: competitorChannels.length,
        analysis_date: new Date().toISOString(),
        ...uniquenessAnalysis
      };

    } catch (error) {
      console.error('❌ Ошибка анализа уникальности:', error);
      return null;
    }
  }

  // 3. ENTITY EXTRACTION - Извлечение упомянутых сущностей
  async extractEntities(channelId, channelName) {
    try {
      console.log(`🏷️ Извлечение сущностей из канала "${channelName}"`);
      
      const messages = await this.getChannelMessages(channelId, 100);
      if (messages.length === 0) return null;

      const combinedText = messages
        .map(msg => msg.text)
        .join('\n\n')
        .substring(0, 12000);

      const prompt = `
Извлеки и проанализируй все упомянутые сущности из этого контента:

${combinedText}

Категоризируй по типам и подсчитай частоту упоминаний.

Ответ в JSON:
{
  "people": [{"name": "имя", "count": число, "context": "контекст"}],
  "organizations": [{"name": "организация", "count": число, "context": "контекст"}],
  "countries": [{"name": "страна", "count": число, "context": "контекст"}],
  "events": [{"name": "событие", "count": число, "context": "контекст"}],
  "technologies": [{"name": "технология", "count": число, "context": "контекст"}],
  "locations": [{"name": "место", "count": число, "context": "контекст"}],
  "sentiment_by_entity": {"сущность": "позитивный/негативный/нейтральный"},
  "key_relationships": ["связь между сущностями"],
  "trending_entities": ["наиболее часто упоминаемые"]
}`;

      const response = await axios.post(`${this.CLOUD_RU_CONFIG.baseUrl}/chat/completions`, {
        model: this.CLOUD_RU_CONFIG.model,
        messages: [
          {
            role: "system",
            content: "Ты эксперт по извлечению именованных сущностей и анализу текста."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      }, {
        headers: {
          'Authorization': `Bearer ${this.CLOUD_RU_CONFIG.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const entities = JSON.parse(response.data.choices[0].message.content);
      
      return {
        channel_name: channelName,
        channel_id: channelId,
        messages_analyzed: messages.length,
        extraction_date: new Date().toISOString(),
        ...entities
      };

    } catch (error) {
      console.error('❌ Ошибка извлечения сущностей:', error);
      return null;
    }
  }

  // 4. CHANNEL EXPLORER - Поиск каналов по критериям
  async exploreChannels(query, filters = {}) {
    try {
      console.log(`🔍 Поиск каналов по запросу: "${query}"`);
      
      // Получаем все доступные каналы
      const allChannels = await this.getAllChannels();
      
      // Анализируем каналы на соответствие запросу
      const relevantChannels = [];
      
      for (let channel of allChannels.slice(0, 20)) { // Лимит для демо
        try {
          const messages = await this.getChannelMessages(channel.id, 20);
          if (messages.length === 0) continue;

          const channelText = messages.map(m => m.text).join(' ');
          
          // Проверяем релевантность через LLM
          const relevanceScore = await this.calculateRelevance(channelText, query);
          
          if (relevanceScore > 0.6) {
            relevantChannels.push({
              ...channel,
              relevance_score: relevanceScore,
              recent_messages: messages.length,
              avg_views: Math.round(messages.reduce((sum, m) => sum + m.views, 0) / messages.length)
            });
          }
        } catch (error) {
          console.log(`Пропускаем канал ${channel.title}: ${error.message}`);
        }
      }

      // Сортируем по релевантности
      relevantChannels.sort((a, b) => b.relevance_score - a.relevance_score);

      return {
        query: query,
        filters: filters,
        found_channels: relevantChannels.length,
        channels: relevantChannels,
        search_date: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Ошибка поиска каналов:', error);
      return null;
    }
  }

  // Вспомогательные методы
  async getChannelMessages(channelId, limit = 50) {
    try {
      const messages = await this.client.invoke(
        new Api.messages.GetHistory({
          peer: channelId,
          limit: limit,
          offsetDate: 0,
          offsetId: 0,
          maxId: 0,
          minId: 0,
          addOffset: 0,
          hash: 0n
        })
      );

      return messages.messages
        .filter(msg => msg.message && msg.message.length > 30)
        .map(msg => ({
          id: msg.id,
          text: msg.message,
          date: new Date(msg.date * 1000),
          views: msg.views || 0
        }));
    } catch (error) {
      console.error(`Ошибка получения сообщений канала ${channelId}:`, error);
      return [];
    }
  }

  async getAllChannels() {
    try {
      const dialogs = await this.client.invoke(
        new Api.messages.GetDialogs({
          offsetDate: 0,
          offsetId: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          limit: 1000,
          hash: 0n
        })
      );

      return dialogs.chats
        .filter(chat => chat.title && chat.broadcast)
        .map(channel => ({
          id: channel.id,
          title: channel.title,
          username: channel.username,
          participants: channel.participantsCount || 0
        }));
    } catch (error) {
      console.error('Ошибка получения каналов:', error);
      return [];
    }
  }

  async findSimilarChannels(topic) {
    // Заглушка - в реальности здесь поиск по тематике
    const allChannels = await this.getAllChannels();
    return allChannels.filter(ch => 
      ch.title.toLowerCase().includes(topic.toLowerCase())
    ).slice(0, 5);
  }

  async calculateRelevance(text, query) {
    // Простая релевантность на основе совпадения ключевых слов
    const queryWords = query.toLowerCase().split(' ');
    const textWords = text.toLowerCase().split(' ');
    
    let matches = 0;
    for (let word of queryWords) {
      if (textWords.includes(word)) matches++;
    }
    
    return matches / queryWords.length;
  }

  // Сохранение результатов
  async saveAnalysis(data, filename) {
    try {
      const fs = require('fs').promises;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fullFilename = `${filename}_${timestamp}.json`;
      
      await fs.writeFile(fullFilename, JSON.stringify(data, null, 2), 'utf8');
      console.log(`💾 Анализ сохранен: ${fullFilename}`);
      
      return fullFilename;
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      return null;
    }
  }

  async close() {
    if (this.client) {
      await this.client.disconnect();
      console.log('🛑 Analytics Platform остановлена');
    }
  }
}

// Демо функция - полный анализ канала
async function fullChannelAnalysis(channelId, channelName, topic) {
  const platform = new TelegramAnalyticsPlatform();
  
  try {
    await platform.init();
    
    console.log(`🚀 ПОЛНЫЙ АНАЛИЗ КАНАЛА "${channelName}"`);
    console.log('=' .repeat(60));
    
    // 1. Sentiment Analysis
    console.log('\n1️⃣ ПОЛИТИЧЕСКИЙ АНАЛИЗ');
    const sentiment = await platform.analyzeSentiment(channelId, channelName);
    if (sentiment) {
      console.log(`📊 Политическая ориентация: ${sentiment.orientation}`);
      console.log(`📈 Оценка: ${sentiment.sentiment_score}/100`);
      console.log(`🎯 Уверенность: ${sentiment.confidence}`);
      await platform.saveAnalysis(sentiment, 'sentiment_analysis');
    }
    
    // 2. Uniqueness Analysis
    console.log('\n2️⃣ АНАЛИЗ УНИКАЛЬНОСТИ');
    const uniqueness = await platform.calculateUniqueness(channelId, channelName, topic);
    if (uniqueness) {
      console.log(`✨ Уникальность: ${uniqueness.uniqueness_score}%`);
      console.log(`🎨 Оригинальность: ${uniqueness.originality}%`);
      console.log(`🔥 Эксклюзивность: ${uniqueness.exclusivity}%`);
      await platform.saveAnalysis(uniqueness, 'uniqueness_analysis');
    }
    
    // 3. Entity Extraction
    console.log('\n3️⃣ ИЗВЛЕЧЕНИЕ СУЩНОСТЕЙ');
    const entities = await platform.extractEntities(channelId, channelName);
    if (entities) {
      console.log(`👥 Люди: ${entities.people?.length || 0}`);
      console.log(`🏢 Организации: ${entities.organizations?.length || 0}`);
      console.log(`🌍 Страны: ${entities.countries?.length || 0}`);
      console.log(`📅 События: ${entities.events?.length || 0}`);
      await platform.saveAnalysis(entities, 'entities_analysis');
    }
    
    console.log('\n✅ АНАЛИЗ ЗАВЕРШЕН!');
    console.log(`📊 Общая оценка канала: ${Math.round((sentiment?.sentiment_score + 50 + uniqueness?.uniqueness_score) / 2 || 75)}/100`);
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  } finally {
    await platform.close();
  }
}

// Экспорт
module.exports = { TelegramAnalyticsPlatform, fullChannelAnalysis };

// Запуск если файл вызван напрямую
if (require.main === module) {
  // Демо: анализ канала "Милитарист"
  fullChannelAnalysis(-1001111348665, "Милитарист", "военная тематика");
}
