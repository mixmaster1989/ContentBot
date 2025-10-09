require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { GlobalChannelFinder } = require('./core/global-channel-finder');

class GlobalSearchTest {
  constructor() {
    // Меняем рабочую директорию как в goodnight-message.js
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.searchEngine = new GlobalChannelFinder();
  }

  async init() {
    try {
      console.log('🔍 Инициализация тестирования глобального поиска...');
      
      await this.mt.start();
      console.log('✅ MTProto клиент подключен');
      
      // Инициализируем поисковый движок с правильным клиентом
      await this.searchEngine.init(this.client);
      console.log('✅ GlobalChannelFinder инициализирован');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async testGlobalSearch(query) {
    try {
      console.log(`\n🔍 ТЕСТИРОВАНИЕ ГЛОБАЛЬНОГО ПОИСКА: "${query}"`);
      console.log('='.repeat(60));
      
      // Выполняем только глобальный поиск
      const results = await this.searchEngine.performGlobalSearch(query, {
        limit: 10,
        timeout: 30000
      });
      
      console.log(`\n📊 РЕЗУЛЬТАТЫ ГЛОБАЛЬНОГО ПОИСКА:`);
      console.log(`📈 Найдено: ${results.length} каналов/групп`);
      
      if (results.length === 0) {
        console.log('❌ Ничего не найдено');
        return [];
      }
      
      console.log('\n📋 СПИСОК НАЙДЕННЫХ КАНАЛОВ:');
      console.log('-'.repeat(60));
      
      results.forEach((result, index) => {
        console.log(`${index + 1}. 📺 ${result.title}`);
        console.log(`   🆔 ID: ${result.id}`);
        console.log(`   👥 Участников: ${result.participantsCount || 'неизвестно'}`);
        console.log(`   📊 Тип: ${result.type}`);
        console.log(`   🏷️ Категория: ${result.category}`);
        if (result.username) console.log(`   👤 Username: @${result.username}`);
        if (result.description) {
          const desc = result.description.length > 100 
            ? result.description.substring(0, 100) + '...'
            : result.description;
          console.log(`   📝 Описание: ${desc}`);
        }
        console.log('');
      });
      
      return results;
      
    } catch (error) {
      console.error('❌ Ошибка тестирования глобального поиска:', error);
      return [];
    }
  }

  async testComprewehensiveSearch(query) {
    try {
      console.log(`\n🔍 ТЕСТИРОВАНИЕ КОМПЛЕКСНОГО ПОИСКА: "${query}"`);
      console.log('='.repeat(60));
      
      // Выполняем комплексный поиск
      const results = await this.searchEngine.comprehensiveSearch(query, {
        maxResults: 15,
        deepSearch: true,
        timeout: 30000
      });
      
      console.log(`\n📊 РЕЗУЛЬТАТЫ КОМПЛЕКСНОГО ПОИСКА:`);
      console.log(`📈 Найдено: ${results.length} каналов/групп`);
      
      if (results.length === 0) {
        console.log('❌ Ничего не найдено');
        return [];
      }
      
      console.log('\n📋 СПИСОК НАЙДЕННЫХ КАНАЛОВ:');
      console.log('-'.repeat(60));
      
      results.forEach((result, index) => {
        console.log(`${index + 1}. 📺 ${result.title}`);
        console.log(`   🆔 ID: ${result.id}`);
        console.log(`   👥 Участников: ${result.participantsCount || 'неизвестно'}`);
        console.log(`   📊 Тип: ${result.type}`);
        console.log(`   🏷️ Категория: ${result.category}`);
        if (result.username) console.log(`   👤 Username: @${result.username}`);
        console.log('');
      });
      
      return results;
      
    } catch (error) {
      console.error('❌ Ошибка тестирования комплексного поиска:', error);
      return [];
    }
  }

  async runAllTests() {
    const testQueries = [
      'telegram',
      'криптовалюты', 
      'bitcoin',
      'новости',
      'технологии'
    ];
    
    console.log('🧪 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ ПОИСКА');
    console.log('='.repeat(70));
    
    for (let query of testQueries) {
      // Тестируем глобальный поиск
      const globalResults = await this.testGlobalSearch(query);
      
      // Ждем 2 секунды между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Тестируем комплексный поиск
      const comprehensiveResults = await this.testComprewehensiveSearch(query);
      
      console.log(`\n📈 СВОДКА ДЛЯ ЗАПРОСА "${query}":`);
      console.log(`   🌐 Глобальный поиск: ${globalResults.length} результатов`);
      console.log(`   🔍 Комплексный поиск: ${comprehensiveResults.length} результатов`);
      console.log('');
      
      // Ждем 3 секунды между разными запросами
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('✅ ВСЕ ТЕСТЫ ЗАВЕРШЕНЫ');
  }
}

async function runSearchTests() {
  const tester = new GlobalSearchTest();
  
  try {
    await tester.init();
    
    // Можно запустить все тесты или конкретный
    if (process.argv[2]) {
      // Если передан аргумент - тестируем конкретный запрос
      const query = process.argv.slice(2).join(' ');
      await tester.testGlobalSearch(query);
      await tester.testComprewehensiveSearch(query);
    } else {
      // Иначе запускаем все тесты
      await tester.runAllTests();
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  }
}

runSearchTests();
