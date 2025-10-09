require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');

class MessagesExtractionTester {
  constructor() {
    // Меняем рабочую директорию как в goodnight-message.js
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
  }

  async init() {
    try {
      console.log('🧪 Инициализация тестера извлечения сообщений...');
      
      await this.mt.start();
      console.log('✅ MTProto клиент подключен');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  /**
   * Тест получения сообщений из канала по username
   */
  async testGetMessagesByUsername(username) {
    try {
      console.log(`\n📨 ТЕСТ ПОЛУЧЕНИЯ СООБЩЕНИЙ: @${username}`);
      console.log('='.repeat(60));
      
      const startTime = Date.now();
      
      // Пробуем получить сообщения
      const messages = await this.client.getMessages(username, { limit: 10 });
      const duration = Date.now() - startTime;
      
      console.log(`⏱️ Время выполнения: ${duration}мс`);
      console.log(`📊 Найдено сообщений: ${messages.length}`);
      
      if (messages.length > 0) {
        console.log('\n📋 ПЕРВЫЕ 3 СООБЩЕНИЯ:');
        messages.slice(0, 3).forEach((msg, index) => {
          console.log(`\n${index + 1}. 📝 Сообщение #${msg.id}:`);
          console.log(`   📅 Дата: ${new Date(msg.date * 1000).toLocaleString()}`);
          console.log(`   👀 Просмотры: ${msg.views || 'неизвестно'}`);
          console.log(`   📏 Длина: ${msg.message?.length || 0} символов`);
          console.log(`   🖼️ Медиа: ${msg.media ? 'Да' : 'Нет'}`);
          console.log(`   🔄 Пересылка: ${msg.fwdFrom ? 'Да' : 'Нет'}`);
          console.log(`   📝 Текст: ${(msg.message || '').substring(0, 100)}...`);
        });
        
        // Собираем метрики
        const metrics = this.calculateMetrics(messages);
        console.log('\n📊 СОБРАННЫЕ МЕТРИКИ:');
        console.log(`   📝 Всего сообщений: ${metrics.totalMessages}`);
        console.log(`   📈 Средние просмотры: ${metrics.avgViews}`);
        console.log(`   ❤️ Средние реакции: ${metrics.avgReactions}`);
        console.log(`   📏 Средняя длина: ${metrics.avgLength} символов`);
        console.log(`   🖼️ Медиа контент: ${metrics.mediaPercentage}%`);
        console.log(`   🔄 Пересылки: ${metrics.forwardPercentage}%`);
        console.log(`   📅 Последний пост: ${metrics.lastPostDate}`);
        
        return { success: true, messages, metrics };
        
      } else {
        console.log('❌ Сообщения не найдены');
        return { success: false, error: 'Нет сообщений' };
      }
      
    } catch (error) {
      console.error(`❌ Ошибка получения сообщений из @${username}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Вычисляет метрики из сообщений
   */
  calculateMetrics(messages) {
    if (!messages || messages.length === 0) {
      return {
        totalMessages: 0,
        avgViews: 0,
        avgReactions: 0,
        avgLength: 0,
        mediaPercentage: 0,
        forwardPercentage: 0,
        lastPostDate: null
      };
    }

    let totalViews = 0;
    let totalReactions = 0;
    let totalLength = 0;
    let mediaCount = 0;
    let forwardCount = 0;
    let validMessages = 0;

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

    return {
      totalMessages: validMessages,
      avgViews: validMessages > 0 ? Math.round(totalViews / validMessages) : 0,
      avgReactions: validMessages > 0 ? Math.round(totalReactions / validMessages) : 0,
      avgLength: validMessages > 0 ? Math.round(totalLength / validMessages) : 0,
      mediaPercentage: validMessages > 0 ? Math.round((mediaCount / validMessages) * 100) : 0,
      forwardPercentage: validMessages > 0 ? Math.round((forwardCount / validMessages) * 100) : 0,
      lastPostDate: messages[0]?.date ? new Date(messages[0].date * 1000).toLocaleString() : null
    };
  }

  /**
   * Тест нескольких каналов
   */
  async testMultipleChannels() {
    const testChannels = [
      'bitcoin',           // Должен работать
      'Coin_Post',         // Должен работать  
      'bitcoin_bullet_vip', // Может не работать
      'telegram',          // Должен работать
      'durov'              // Должен работать
    ];

    console.log('\n🧪 ТЕСТ НЕСКОЛЬКИХ КАНАЛОВ');
    console.log('='.repeat(60));

    const results = [];

    for (const username of testChannels) {
      console.log(`\n🔍 Тестирую @${username}...`);
      
      const result = await this.testGetMessagesByUsername(username);
      results.push({ username, ...result });
      
      // Задержка между запросами
      await this.delay(1000);
    }

    // Сводка
    console.log('\n📊 СВОДКА РЕЗУЛЬТАТОВ:');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Успешно: ${successful.length}/${results.length}`);
    console.log(`❌ Неудачно: ${failed.length}/${results.length}`);
    
    if (successful.length > 0) {
      console.log('\n✅ РАБОТАЮЩИЕ КАНАЛЫ:');
      successful.forEach(r => {
        console.log(`   @${r.username} - ${r.messages.length} сообщений, ${r.metrics.avgViews} просмотров`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ НЕРАБОТАЮЩИЕ КАНАЛЫ:');
      failed.forEach(r => {
        console.log(`   @${r.username} - ${r.error}`);
      });
    }

    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function runTests() {
  const tester = new MessagesExtractionTester();
  
  try {
    await tester.init();
    
    if (process.argv[2]) {
      // Тестируем конкретный канал
      const username = process.argv[2].replace('@', '');
      await tester.testGetMessagesByUsername(username);
    } else {
      // Тестируем несколько каналов
      await tester.testMultipleChannels();
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  }
}

console.log('🚀 MESSAGES EXTRACTION TESTER');
console.log('==============================');
console.log('Использование:');
console.log('  node test-messages-extraction.js          - тест нескольких каналов');
console.log('  node test-messages-extraction.js bitcoin  - тест конкретного канала');
console.log('');

runTests();
