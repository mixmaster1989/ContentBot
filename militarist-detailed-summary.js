require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');
const axios = require('axios');

class MilitaristDetailedSummarizer {
  constructor() {
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.militaristChannelId = -1001111348665; // ID канала "Милитарист"
  }

  async init() {
    try {
      await this.client.connect();
      console.log('✅ Подключение к Telegram установлено');
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
    }
  }

  // Получить сообщения
  async getMessages() {
    try {
      console.log('📅 Получаю сообщения из канала "Милитарист"...');
      
      const messages = await this.client.invoke(
        new Api.messages.GetHistory({
          peer: this.militaristChannelId,
          limit: 100,
          offsetDate: 0,
          offsetId: 0,
          maxId: 0,
          minId: 0,
          addOffset: 0,
          hash: 0n
        })
      );

      console.log(`✅ Получено ${messages.messages.length} сообщений`);
      
      // Фильтруем сообщения по наличию текста
      const filteredMessages = messages.messages
        .filter(msg => 
          msg.message && 
          msg.message.length > 30 // Минимум 30 символов
        )
        .map(msg => ({
          id: msg.id,
          text: msg.message,
          date: new Date(msg.date * 1000),
          views: msg.views || 0,
          timestamp: msg.date * 1000
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // Сортируем по времени (новые сверху)

      console.log(`📊 Отфильтровано ${filteredMessages.length} релевантных сообщений`);
      
      return filteredMessages;

    } catch (error) {
      console.error('❌ Ошибка получения сообщений:', error);
      return [];
    }
  }

  // Создать детальную сводку
  async createDetailedSummary(messages) {
    try {
      console.log('🤖 Создаю детальную сводку...');
      
      // Анализируем сообщения и группируем по темам
      const topics = this.analyzeTopics(messages);
      
      // Создаем сводку по темам
      let summary = `🎯 СВОДКА КАНАЛА "МИЛИТАРИСТ"\n`;
      summary += `📅 Период: ${messages[messages.length - 1]?.date.toLocaleString('ru')} - ${messages[0]?.date.toLocaleString('ru')}\n`;
      summary += `📝 Сообщений: ${messages.length}\n`;
      summary += `👀 Общее количество просмотров: ${messages.reduce((sum, msg) => sum + msg.views, 0).toLocaleString()}\n\n`;
      
      summary += `📊 ОСНОВНЫЕ ТЕМЫ:\n`;
      summary += `================\n\n`;
      
      for (let topic of topics) {
        summary += `🔸 ${topic.name}: ${topic.count} сообщений\n`;
        summary += `   Примеры: ${topic.examples.join(', ')}\n\n`;
      }
      
      summary += `📋 ДЕТАЛЬНЫЙ АНАЛИЗ:\n`;
      summary += `===================\n\n`;
      
      // Анализируем топ-сообщения по просмотрам
      const topMessages = messages
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
      
      summary += `🔥 ТОП-10 СООБЩЕНИЙ ПО ПРОСМОТРАМ:\n`;
      topMessages.forEach((msg, index) => {
        const text = msg.text.length > 100 ? msg.text.substring(0, 100) + '...' : msg.text;
        summary += `${index + 1}. [${msg.views.toLocaleString()} просмотров] ${text}\n`;
        summary += `   📅 ${msg.date.toLocaleString('ru')}\n\n`;
      });
      
      // Анализируем активность по времени
      const hourlyActivity = this.analyzeHourlyActivity(messages);
      summary += `⏰ АКТИВНОСТЬ ПО ЧАСАМ:\n`;
      summary += `=====================\n`;
      hourlyActivity.forEach((hour, index) => {
        summary += `${hour.hour}:00 - ${hour.count} сообщений\n`;
      });
      
      summary += `\n📈 СТАТИСТИКА:\n`;
      summary += `==============\n`;
      summary += `• Среднее просмотров на пост: ${Math.round(messages.reduce((sum, msg) => sum + msg.views, 0) / messages.length).toLocaleString()}\n`;
      summary += `• Самый популярный пост: ${Math.max(...messages.map(m => m.views)).toLocaleString()} просмотров\n`;
      summary += `• Общий охват: ${messages.reduce((sum, msg) => sum + msg.views, 0).toLocaleString()} просмотров\n`;
      
      return summary;

    } catch (error) {
      console.error('❌ Ошибка создания сводки:', error);
      return `Ошибка создания детальной сводки: ${error.message}`;
    }
  }

  // Анализ тем сообщений
  analyzeTopics(messages) {
    const topics = {
      'Военные операции': { count: 0, examples: [] },
      'Военная техника': { count: 0, examples: [] },
      'Конфликты': { count: 0, examples: [] },
      'Терроризм': { count: 0, examples: [] },
      'Оборона': { count: 0, examples: [] },
      'Разведка': { count: 0, examples: [] }
    };

    const keywords = {
      'Военные операции': ['операция', 'наступление', 'атака', 'оборона', 'позиции', 'фронт'],
      'Военная техника': ['танк', 'броня', 'ракета', 'дрон', 'самолет', 'вертолет', 'оружие'],
      'Конфликты': ['конфликт', 'война', 'сражение', 'бои', 'столкновение'],
      'Терроризм': ['террорист', 'террор', 'взрыв', 'теракт', 'джихад'],
      'Оборона': ['оборона', 'защита', 'укрепления', 'позиции'],
      'Разведка': ['разведка', 'шпион', 'информация', 'данные']
    };

    messages.forEach(msg => {
      const text = msg.text.toLowerCase();
      const shortText = msg.text.length > 50 ? msg.text.substring(0, 50) + '...' : msg.text;
      
      for (let [topic, words] of Object.entries(keywords)) {
        if (words.some(word => text.includes(word))) {
          topics[topic].count++;
          if (topics[topic].examples.length < 3) {
            topics[topic].examples.push(shortText);
          }
        }
      }
    });

    return Object.entries(topics)
      .map(([name, data]) => ({ name, count: data.count, examples: data.examples }))
      .filter(topic => topic.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  // Анализ активности по часам
  analyzeHourlyActivity(messages) {
    const hourly = {};
    
    messages.forEach(msg => {
      const hour = msg.date.getHours();
      hourly[hour] = (hourly[hour] || 0) + 1;
    });

    return Object.entries(hourly)
      .map(([hour, count]) => ({ hour: hour.padStart(2, '0'), count }))
      .sort((a, b) => b.count - a.count);
  }

  // Сохранить сводку в файл
  async saveSummary(summary) {
    try {
      const fs = require('fs').promises;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `militarist_detailed_summary_${timestamp}.txt`;
      
      await fs.writeFile(filename, summary, 'utf8');
      console.log(`💾 Детальная сводка сохранена в файл: ${filename}`);
      
      return filename;
    } catch (error) {
      console.error('❌ Ошибка сохранения файла:', error);
      return null;
    }
  }

  async close() {
    if (this.client) {
      await this.client.disconnect();
      console.log('🛑 Соединение закрыто');
    }
  }
}

// Основная функция
async function createDetailedSummary() {
  const summarizer = new MilitaristDetailedSummarizer();
  
  try {
    await summarizer.init();
    
    console.log('🎯 Создание детальной сводки канала "Милитарист"');
    console.log('');
    
    // Получаем сообщения
    const messages = await summarizer.getMessages();
    
    if (messages.length === 0) {
      console.log('❌ Сообщения не найдены');
      return;
    }
    
    // Создаем детальную сводку
    const summary = await summarizer.createDetailedSummary(messages);
    
    // Показываем результат
    console.log('\n' + '='.repeat(80));
    console.log(summary);
    console.log('='.repeat(80));
    
    // Сохраняем в файл
    await summarizer.saveSummary(summary);
    
    console.log('\n✅ Детальная сводка создана успешно!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await summarizer.close();
  }
}

// Запуск создания сводки
if (require.main === module) {
  createDetailedSummary();
}

module.exports = { MilitaristDetailedSummarizer };
