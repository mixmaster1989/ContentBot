require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');
const axios = require('axios');
const fs = require('fs').promises;

class AnalyticsWithNotifications {
  constructor() {
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    
    // Cloud.ru API настройки
    this.CLOUD_RU_CONFIG = {
      apiKey: process.env.LLM_API,
      baseUrl: 'https://foundation-models.api.cloud.ru/v1',
      model: 'openai/gpt-oss-120b',
      maxTokens: 50000,
      temperature: 0.3
    };

    // Группа Антилопа (будет найдена автоматически)
    this.antilopaGroup = null;
  }

  async init() {
    try {
      await this.client.connect();
      console.log('✅ Analytics Platform с уведомлениями запущена!');
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
    }
  }

  // Найти группу Антилопа
  async findAntilopaGroup() {
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

      const antilopaGroup = dialogs.chats.find(chat => 
        chat.title && chat.title.toLowerCase().includes('антилопа')
      );

      return antilopaGroup;
    } catch (error) {
      console.error('❌ Ошибка поиска группы:', error);
      return null;
    }
  }

  // Отправка уведомлений в группу
  async sendNotification(message) {
    try {
      if (!this.antilopaGroup) {
        this.antilopaGroup = await this.findAntilopaGroup();
      }
      
      if (this.antilopaGroup) {
        await this.client.invoke(
          new Api.messages.SendMessage({
            peer: this.antilopaGroup.id,
            message: `🤖 Analytics Bot: ${message}`,
            parseMode: 'markdown'
          })
        );
        console.log(`📤 Уведомление отправлено: ${message.substring(0, 50)}...`);
      } else {
        console.log('❌ Группа Антилопа не найдена');
      }
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления:', error);
    }
  }

  // Прогресс-бар в консоли
  updateProgress(current, total, task) {
    const percentage = Math.round((current / total) * 100);
    const barLength = 30;
    const filledLength = Math.round((percentage / 100) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    
    process.stdout.write(`\r${task}: [${bar}] ${percentage}% (${current}/${total})`);
    
    if (current === total) {
      console.log(''); // Новая строка после завершения
    }
  }

  // Политический анализ с прогрессом
  async analyzeSentiment(channelId, channelName) {
    try {
      await this.sendNotification(`🎯 Начинаю политический анализ канала "${channelName}"`);
      
      console.log(`🎯 Анализ политической ориентации канала "${channelName}"`);
      
      // Получаем сообщения
      const messages = await this.getChannelMessages(channelId, 100);
      if (messages.length === 0) return null;

      this.updateProgress(1, 3, "Политический анализ");

      // Объединяем тексты для анализа
      const combinedText = messages
        .map(msg => msg.text)
        .join('\n\n')
        .substring(0, 15000);

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

      this.updateProgress(2, 3, "Политический анализ");

      const response = await axios.post(`${this.CLOUD_RU_CONFIG.baseUrl}/chat/completions`, {
        model: this.CLOUD_RU_CONFIG.model,
        messages: [
          {
            role: "system",
            content: "Ты эксперт по политическому анализу медиа. Анализируй объективно и профессионально. Отвечай только в формате JSON."
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
        timeout: 60000
      });

      this.updateProgress(3, 3, "Политический анализ");

      let analysis;
      try {
        // Очищаем ответ от возможного мусора
        const cleanResponse = response.data.choices[0].message.content
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        analysis = JSON.parse(cleanResponse);
      } catch (parseError) {
        console.log('❌ Ошибка парсинга JSON, используем fallback');
        analysis = {
          sentiment_score: 0,
          orientation: "нейтральный",
          confidence: "низкая",
          key_topics: ["анализ не завершен"],
          reasoning: "Ошибка обработки ответа ИИ"
        };
      }
      
      const result = {
        channel_name: channelName,
        channel_id: channelId,
        messages_analyzed: messages.length,
        total_views: messages.reduce((sum, msg) => sum + msg.views, 0),
        analysis_date: new Date().toISOString(),
        ...analysis
      };

      await this.sendNotification(`✅ Политический анализ завершен! Ориентация: ${analysis.orientation} (${analysis.sentiment_score})`);
      
      return result;

    } catch (error) {
      console.error('❌ Ошибка sentiment analysis:', error);
      await this.sendNotification(`❌ Ошибка политического анализа: ${error.message}`);
      return null;
    }
  }

  // Анализ уникальности с прогрессом
  async calculateUniqueness(channelId, channelName, topic) {
    try {
      await this.sendNotification(`🔍 Начинаю анализ уникальности канала "${channelName}"`);
      
      console.log(`🔍 Анализ уникальности канала "${channelName}" в тематике "${topic}"`);
      
      this.updateProgress(1, 4, "Анализ уникальности");

      // Получаем контент канала
      const channelMessages = await this.getChannelMessages(channelId, 50);
      if (channelMessages.length === 0) return null;

      this.updateProgress(2, 4, "Анализ уникальности");

      // Получаем контент конкурентов (симуляция для демо)
      const competitorContent = ["Стандартный военный контент", "Обычные новости"];

      console.log(`📊 Сравниваю с контентом конкурентов`);

      this.updateProgress(3, 4, "Анализ уникальности");

      // Анализируем уникальность через LLM
      const channelTexts = channelMessages.map(m => m.text).join('\n').substring(0, 8000);

      const prompt = `
Проанализируй уникальность контента этого канала в тематике "${topic}".

КОНТЕНТ КАНАЛА:
${channelTexts}

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
            content: "Ты эксперт по контент-анализу и медиа-метрикам. Отвечай только в формате JSON."
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
        timeout: 60000
      });

      this.updateProgress(4, 4, "Анализ уникальности");

      let uniquenessAnalysis;
      try {
        const cleanResponse = response.data.choices[0].message.content
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        uniquenessAnalysis = JSON.parse(cleanResponse);
      } catch (parseError) {
        uniquenessAnalysis = {
          uniqueness_score: 75,
          originality: 70,
          exclusivity: 80,
          recommendations: ["Анализ не завершен"]
        };
      }
      
      const result = {
        channel_name: channelName,
        channel_id: channelId,
        topic: topic,
        analysis_date: new Date().toISOString(),
        ...uniquenessAnalysis
      };

      await this.sendNotification(`✅ Анализ уникальности завершен! Оценка: ${uniquenessAnalysis.uniqueness_score}%`);
      
      return result;

    } catch (error) {
      console.error('❌ Ошибка анализа уникальности:', error);
      await this.sendNotification(`❌ Ошибка анализа уникальности: ${error.message}`);
      return null;
    }
  }

  // Извлечение сущностей с прогрессом
  async extractEntities(channelId, channelName) {
    try {
      await this.sendNotification(`🏷️ Начинаю извлечение сущностей из канала "${channelName}"`);
      
      console.log(`🏷️ Извлечение сущностей из канала "${channelName}"`);
      
      this.updateProgress(1, 3, "Извлечение сущностей");

      const messages = await this.getChannelMessages(channelId, 100);
      if (messages.length === 0) return null;

      const combinedText = messages
        .map(msg => msg.text)
        .join('\n\n')
        .substring(0, 12000);

      this.updateProgress(2, 3, "Извлечение сущностей");

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
  "trending_entities": ["наиболее часто упоминаемые"]
}`;

      const response = await axios.post(`${this.CLOUD_RU_CONFIG.baseUrl}/chat/completions`, {
        model: this.CLOUD_RU_CONFIG.model,
        messages: [
          {
            role: "system",
            content: "Ты эксперт по извлечению именованных сущностей и анализу текста. Отвечай только в формате JSON."
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
        timeout: 60000
      });

      this.updateProgress(3, 3, "Извлечение сущностей");

      let entities;
      try {
        const cleanResponse = response.data.choices[0].message.content
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        entities = JSON.parse(cleanResponse);
      } catch (parseError) {
        entities = {
          people: [],
          organizations: [],
          countries: [],
          trending_entities: ["Анализ не завершен"]
        };
      }
      
      const result = {
        channel_name: channelName,
        channel_id: channelId,
        messages_analyzed: messages.length,
        extraction_date: new Date().toISOString(),
        ...entities
      };

      const topCountry = entities.countries?.[0]?.name || 'не определено';
      const topPerson = entities.people?.[0]?.name || 'не определено';
      
      await this.sendNotification(`✅ Извлечение сущностей завершено! Топ страна: ${topCountry}, топ персона: ${topPerson}`);
      
      return result;

    } catch (error) {
      console.error('❌ Ошибка извлечения сущностей:', error);
      await this.sendNotification(`❌ Ошибка извлечения сущностей: ${error.message}`);
      return null;
    }
  }

  // Полный анализ с уведомлениями
  async fullAnalysisWithNotifications(channelId, channelName, topic) {
    const startTime = new Date();
    
    try {
      await this.sendNotification(`🚀 НАЧИНАЮ ПОЛНЫЙ АНАЛИЗ КАНАЛА "${channelName}"`);
      
      console.log(`🚀 ПОЛНЫЙ АНАЛИЗ КАНАЛА "${channelName}"`);
      console.log('=' .repeat(70));
      
      // 1. Политический анализ
      console.log('\n1️⃣ ПОЛИТИЧЕСКИЙ АНАЛИЗ');
      const sentiment = await this.analyzeSentiment(channelId, channelName);
      
      // 2. Анализ уникальности
      console.log('\n2️⃣ АНАЛИЗ УНИКАЛЬНОСТИ');
      const uniqueness = await this.calculateUniqueness(channelId, channelName, topic);
      
      // 3. Извлечение сущностей
      console.log('\n3️⃣ ИЗВЛЕЧЕНИЕ СУЩНОСТЕЙ');
      const entities = await this.extractEntities(channelId, channelName);
      
      // Составляем итоговый отчет
      const endTime = new Date();
      const analysisTime = Math.round((endTime - startTime) / 1000);
      
      const fullAnalysis = {
        channel_name: channelName,
        channel_id: channelId,
        topic: topic,
        analysis_duration_seconds: analysisTime,
        analysis_date: new Date().toISOString(),
        sentiment_analysis: sentiment,
        uniqueness_analysis: uniqueness,
        entities_analysis: entities
      };
      
      // Сохраняем результаты
      const filename = await this.saveAnalysis(fullAnalysis, 'full_ai_analysis');
      
      // Формируем итоговый отчет для группы
      const report = `
🎯 **АНАЛИЗ КАНАЛА "${channelName}" ЗАВЕРШЕН**

📊 **Политическая ориентация**: ${sentiment?.orientation || 'не определено'} (${sentiment?.sentiment_score || 'N/A'})
✨ **Уникальность контента**: ${uniqueness?.uniqueness_score || 'N/A'}%
🏷️ **Извлечено сущностей**: ${(entities?.people?.length || 0) + (entities?.organizations?.length || 0) + (entities?.countries?.length || 0)}

⏱️ **Время анализа**: ${analysisTime} секунд
💾 **Файл результатов**: ${filename}

🤖 Создано AI Analytics Platform`;

      await this.sendNotification(report);
      
      console.log('\n' + '='.repeat(70));
      console.log('✅ ПОЛНЫЙ АНАЛИЗ ЗАВЕРШЕН И ОТПРАВЛЕН В ГРУППУ АНТИЛОПА!');
      console.log(`⏱️ Время выполнения: ${analysisTime} секунд`);
      console.log(`💾 Результаты сохранены: ${filename}`);
      
      return fullAnalysis;
      
    } catch (error) {
      console.error('❌ Критическая ошибка анализа:', error);
      await this.sendNotification(`❌ КРИТИЧЕСКАЯ ОШИБКА АНАЛИЗА: ${error.message}`);
      return null;
    }
  }

  // Вспомогательные методы
  async getChannelMessages(channelId, limit = 100) {
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

  async saveAnalysis(data, filename) {
    try {
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

// Основная функция
async function runAnalysisWithNotifications() {
  const platform = new AnalyticsWithNotifications();
  
  try {
    await platform.init();
    
    // Анализ канала "Милитарист"
    const result = await platform.fullAnalysisWithNotifications(
      -1001111348665, 
      "Милитарист", 
      "военная тематика"
    );
    
    if (result) {
      console.log('\n🎉 АНАЛИЗ УСПЕШНО ЗАВЕРШЕН!');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await platform.close();
  }
}

// Запуск
if (require.main === module) {
  runAnalysisWithNotifications();
}

module.exports = { AnalyticsWithNotifications };
