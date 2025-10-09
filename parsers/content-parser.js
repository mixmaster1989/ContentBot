const { MTProtoClient } = require('../../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');
const fs = require('fs').promises;
const path = require('path');

class ContentParser {
  constructor() {
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    
    // Источники контента по тематикам
    this.contentSources = {
      'бизнес': ['@business_channel', '@entrepreneur_tips', '@startup_news'],
      'мотивация': ['@motivation_daily', '@success_mindset', '@self_development'],
      'технологии': ['@tech_news_ru', '@programming_tips', '@ai_updates'],
      'психология': ['@psychology_facts', '@mental_health', '@mindfulness_ru'],
      'спорт': ['@fitness_motivation', '@workout_tips', '@sport_news'],
      'финансы': ['@finance_tips', '@investment_ru', '@money_mindset'],
      'путешествия': ['@travel_inspiration', '@world_places', '@travel_tips'],
      'здоровье': ['@health_tips', '@nutrition_facts', '@wellness_ru'],
      'образование': ['@learning_tips', '@knowledge_base', '@education_ru'],
      'универсальный': ['@wisdom_quotes', '@life_hacks', '@daily_inspiration']
    };
    
    this.processedContent = new Set();
    this.contentCache = new Map();
  }

  async init() {
    try {
      await this.client.connect();
      console.log('✅ Парсер контента подключен к Telegram');
    } catch (error) {
      console.error('❌ Ошибка подключения парсера:', error);
    }
  }

  // Получить случайный контент
  async getRandomContent() {
    const topics = Object.keys(this.contentSources);
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    return await this.getContentByTopic(randomTopic);
  }

  // Получить контент по тематике
  async getContentByTopic(topic) {
    const sources = this.contentSources[topic] || this.contentSources['универсальный'];
    
    for (let source of sources) {
      try {
        const content = await this.parseChannelContent(source);
        if (content) {
          return {
            text: content.text,
            source: source,
            topic: topic,
            timestamp: Date.now(),
            media: content.media || null
          };
        }
      } catch (error) {
        console.error(`❌ Ошибка парсинга ${source}:`, error);
        continue;
      }
    }
    
    // Fallback контент
    return this.getFallbackContent(topic);
  }

  // Парсинг контента из канала
  async parseChannelContent(channelUsername) {
    try {
      // Получаем канал
      const channel = await this.client.invoke(
        new Api.contacts.ResolveUsername({ username: channelUsername.replace('@', '') })
      );
      
      if (!channel.chats?.[0]) {
        throw new Error(`Канал ${channelUsername} не найден`);
      }

      const channelEntity = channel.chats[0];
      
      // Получаем последние сообщения
      const messages = await this.client.invoke(
        new Api.messages.GetHistory({
          peer: channelEntity.id,
          limit: 50,
          offsetDate: 0,
          offsetId: 0,
          maxId: 0,
          minId: 0,
          addOffset: 0,
          hash: 0n
        })
      );

      // Фильтруем подходящие сообщения
      const goodMessages = messages.messages.filter(msg => 
        msg.message && 
        msg.message.length > 100 && 
        msg.message.length < 2000 &&
        !this.processedContent.has(msg.id) &&
        !msg.message.includes('http') &&
        !msg.message.includes('@') &&
        !msg.message.includes('#реклама')
      );

      if (goodMessages.length === 0) {
        return null;
      }

      // Выбираем случайное сообщение
      const randomMessage = goodMessages[Math.floor(Math.random() * goodMessages.length)];
      this.processedContent.add(randomMessage.id);

      return {
        text: randomMessage.message,
        media: randomMessage.media ? await this.processMedia(randomMessage.media) : null,
        originalId: randomMessage.id,
        views: randomMessage.views || 0
      };

    } catch (error) {
      console.error(`Ошибка парсинга канала ${channelUsername}:`, error);
      return null;
    }
  }

  // Обработка медиа
  async processMedia(media) {
    try {
      if (media.className === 'MessageMediaPhoto') {
        return {
          type: 'photo',
          id: media.photo.id,
          sizes: media.photo.sizes
        };
      }
      
      if (media.className === 'MessageMediaDocument' && media.document.mimeType?.startsWith('image/')) {
        return {
          type: 'image',
          id: media.document.id,
          filename: media.document.attributes?.find(attr => attr.fileName)?.fileName
        };
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка обработки медиа:', error);
      return null;
    }
  }

  // Fallback контент при ошибках
  getFallbackContent(topic) {
    const fallbackTexts = {
      'бизнес': 'Успех в бизнесе — это результат правильных решений, принятых в нужное время. Каждый день дает новые возможности для роста и развития.',
      'мотивация': 'Каждое утро у вас есть выбор: продолжать спать с мечтами или проснуться и воплотить их в реальность. Выбор всегда за вами.',
      'технологии': 'Технологии развиваются с невероятной скоростью. То, что казалось фантастикой вчера, сегодня становится реальностью.',
      'универсальный': 'Жизнь — это не то, что с вами происходит, а то, как вы на это реагируете. Ваш взгляд определяет вашу реальность.'
    };

    return {
      text: fallbackTexts[topic] || fallbackTexts['универсальный'],
      source: 'fallback',
      topic: topic,
      timestamp: Date.now(),
      media: null
    };
  }

  // Получить популярные посты для анализа
  async getPopularPosts(channelUsername, limit = 10) {
    try {
      const channel = await this.client.invoke(
        new Api.contacts.ResolveUsername({ username: channelUsername.replace('@', '') })
      );
      
      const messages = await this.client.invoke(
        new Api.messages.GetHistory({
          peer: channel.chats[0].id,
          limit: 100
        })
      );

      // Сортируем по просмотрам
      const popularMessages = messages.messages
        .filter(msg => msg.message && msg.views)
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);

      return popularMessages.map(msg => ({
        text: msg.message,
        views: msg.views,
        date: msg.date,
        id: msg.id
      }));

    } catch (error) {
      console.error('Ошибка получения популярных постов:', error);
      return [];
    }
  }

  // Сохранить обработанный контент
  async saveProcessedContent() {
    try {
      const dataPath = path.join(__dirname, '../data/processed_content.json');
      const data = Array.from(this.processedContent);
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Ошибка сохранения данных:', error);
    }
  }

  // Загрузить обработанный контент
  async loadProcessedContent() {
    try {
      const dataPath = path.join(__dirname, '../data/processed_content.json');
      const data = await fs.readFile(dataPath, 'utf8');
      const ids = JSON.parse(data);
      this.processedContent = new Set(ids);
    } catch (error) {
      console.log('Файл processed_content.json не найден, создаем новый');
    }
  }

  // Добавить источник контента
  addContentSource(topic, channelUsername) {
    if (!this.contentSources[topic]) {
      this.contentSources[topic] = [];
    }
    
    if (!this.contentSources[topic].includes(channelUsername)) {
      this.contentSources[topic].push(channelUsername);
      console.log(`✅ Добавлен источник ${channelUsername} для темы ${topic}`);
    }
  }

  // Получить статистику парсинга
  getStats() {
    return {
      processedMessages: this.processedContent.size,
      availableTopics: Object.keys(this.contentSources),
      totalSources: Object.values(this.contentSources).flat().length,
      cacheSize: this.contentCache.size
    };
  }
}

module.exports = { ContentParser }; 