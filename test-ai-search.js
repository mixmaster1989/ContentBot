require('dotenv').config();
const SmartGlobalSearch = require('./core/smart-global-search');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');

class AISearchTester {
  constructor() {
    // Меняем рабочую директорию как в goodnight-message.js
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.smartSearch = new SmartGlobalSearch();
  }

  async init() {
    try {
      console.log('🧪 Инициализация тестера AI поиска...');
      
      await this.mt.start();
      console.log('✅ MTProto клиент подключен');
      
      await this.smartSearch.init(this.client);
      console.log('✅ SmartGlobalSearch инициализирован');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  /**
   * Тест быстрого поиска без AI
   */
  async testQuickSearch(query) {
    try {
      console.log(`\n⚡ ТЕСТ БЫСТРОГО ПОИСКА: "${query}"`);
      console.log('='.repeat(60));
      
      const startTime = Date.now();
      const results = await this.smartSearch.quickSearch(query, { limit: 5 });
      const duration = Date.now() - startTime;
      
      console.log(`⏱️ Время выполнения: ${duration}мс`);
      console.log(`📊 Найдено: ${results.length} каналов`);
      
      if (results.length > 0) {
        console.log('\n📋 РЕЗУЛЬТАТЫ:');
        results.forEach((channel, index) => {
          console.log(`${index + 1}. 📺 ${channel.title}`);
          console.log(`   👥 ${channel.participantsCount} участников`);
          console.log(`   🏷️ ${channel.category}`);
          if (channel.username) console.log(`   🔗 @${channel.username}`);
          console.log('');
        });
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Ошибка быстрого поиска:', error);
      return [];
    }
  }

  /**
   * Тест умного поиска с AI анализом
   */
  async testSmartSearch(query) {
    try {
      console.log(`\n🧠 ТЕСТ УМНОГО ПОИСКА С AI: "${query}"`);
      console.log('='.repeat(60));
      
      const startTime = Date.now();
      const results = await this.smartSearch.smartSearch(query, { 
        limit: 8,
        aiAnalysisLimit: 5,
        analysisDelay: 1000 // Сокращенная задержка для теста
      });
      const duration = Date.now() - startTime;
      
      console.log(`⏱️ Время выполнения: ${duration}мс`);
      console.log(`📊 Найдено: ${results.length} каналов`);
      
      if (results.length > 0) {
        console.log('\n🧠 РЕЗУЛЬТАТЫ С AI АНАЛИЗОМ:');
        results.forEach((channel, index) => {
          console.log(`${index + 1}. 📺 ${channel.title}`);
          console.log(`   👥 ${channel.participantsCount} участников`);
          
          // Показываем собранные метрики
          const metrics = channel.metrics;
          if (metrics) {
            console.log(`   📊 МЕТРИКИ:`);
            console.log(`      👥 Подписчиков: ${metrics.subscribersCount?.toLocaleString() || 'неизвестно'}`);
            console.log(`      📝 Постов проанализировано: ${metrics.postsAnalyzed || 0}`);
            console.log(`      📈 Постов в день: ${metrics.avgPostsPerDay?.toFixed(1) || 0}`);
            console.log(`      👀 Средние просмотры: ${metrics.avgViewsPerPost || 0}`);
            console.log(`      ❤️ Средние реакции: ${metrics.avgReactionsPerPost || 0}`);
            console.log(`      📏 Средняя длина поста: ${metrics.avgPostLength || 0} символов`);
            console.log(`      🖼️ Медиа контент: ${metrics.mediaPercentage || 0}%`);
            console.log(`      🔄 Пересылки: ${metrics.forwardPercentage || 0}%`);
            if (metrics.lastPostDate) {
              console.log(`      🕒 Последний пост: ${new Date(metrics.lastPostDate).toLocaleDateString()}`);
            }
            console.log('');
          }

          const analysis = channel.aiAnalysis;
          if (analysis && !analysis.error) {
            const scoreEmoji = analysis.qualityScore >= 8 ? '🌟' : 
                              analysis.qualityScore >= 6 ? '⭐' : 
                              analysis.qualityScore >= 4 ? '🔶' : '🔸';
            
            console.log(`   ${scoreEmoji} AI Рейтинг: ${analysis.qualityScore}/10`);
            console.log(`   🎯 Вердикт: ${analysis.verdict}`);
            console.log(`   📚 Образовательная ценность: ${analysis.educationalValue}/10`);
            console.log(`   💰 Коммерческий индекс: ${analysis.commercialIndex}/10`);
            console.log(`   📝 Тип контента: ${analysis.contentType}`);
            console.log(`   👥 Аудитория: ${analysis.targetAudience}`);
            console.log(`   💭 Рекомендация: ${analysis.recommendation}`);
            
            if (analysis.warnings && analysis.warnings.length > 0) {
              console.log(`   ⚠️ Предупреждения: ${analysis.warnings.join(', ')}`);
            }
          } else {
            console.log(`   ❌ AI анализ: ${analysis?.error || 'Недоступен'}`);
          }
          
          if (channel.username) console.log(`   🔗 @${channel.username}`);
          console.log('');
        });
        
        // Статистика AI анализа
        const stats = this.smartSearch.getAIAnalysisStats(results);
        console.log('📊 СТАТИСТИКА AI АНАЛИЗА:');
        console.log(`   🔍 Проанализировано: ${stats.analyzed}/${stats.total}`);
        console.log(`   ⭐ Средний рейтинг: ${stats.avgScore}/10`);
        console.log(`   🌟 Высокое качество: ${stats.highQuality}`);
        console.log(`   📚 Образовательные: ${stats.educational}`);
        console.log(`   💰 Коммерческие: ${stats.commercial}`);
        console.log(`   ⚠️ С предупреждениями: ${stats.withWarnings}`);
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Ошибка умного поиска:', error);
      return [];
    }
  }

  /**
   * Тест форматирования для чата
   */
  async testChatFormatting(query) {
    try {
      console.log(`\n💬 ТЕСТ ФОРМАТИРОВАНИЯ ДЛЯ ЧАТА: "${query}"`);
      console.log('='.repeat(60));
      
      const results = await this.smartSearch.smartSearch(query, { 
        limit: 5,
        aiAnalysisLimit: 3,
        analysisDelay: 800
      });
      
      const formattedMessage = this.smartSearch.formatSmartResultsForChat(results, query);
      
      console.log('📱 СООБЩЕНИЕ ДЛЯ ЧАТА:');
      console.log('-'.repeat(60));
      console.log(formattedMessage);
      console.log('-'.repeat(60));
      
      console.log(`📏 Длина сообщения: ${formattedMessage.length} символов`);
      
      return formattedMessage;
      
    } catch (error) {
      console.error('❌ Ошибка форматирования:', error);
      return null;
    }
  }

  /**
   * Тест фильтрации по AI критериям
   */
  async testAIFiltering(query) {
    try {
      console.log(`\n🔍 ТЕСТ AI ФИЛЬТРАЦИИ: "${query}"`);
      console.log('='.repeat(60));
      
      // Получаем результаты с AI анализом
      const allResults = await this.smartSearch.smartSearch(query, { 
        limit: 10,
        aiAnalysisLimit: 8,
        analysisDelay: 500
      });
      
      console.log(`📊 Всего найдено: ${allResults.length} каналов`);
      
      // Фильтруем высококачественные каналы
      const highQuality = this.smartSearch.filterByAICriteria(allResults, {
        minQualityScore: 7,
        maxCommercialIndex: 5
      });
      
      console.log(`🌟 Высококачественные (рейтинг ≥7, коммерция ≤5): ${highQuality.length}`);
      
      // Фильтруем образовательные каналы
      const educational = this.smartSearch.filterByAICriteria(allResults, {
        minEducationalValue: 6,
        excludeWarnings: true
      });
      
      console.log(`📚 Образовательные (ценность ≥6, без предупреждений): ${educational.length}`);
      
      // Показываем топ результаты
      if (highQuality.length > 0) {
        console.log('\n🌟 ТОП ВЫСОКОКАЧЕСТВЕННЫЕ КАНАЛЫ:');
        highQuality.slice(0, 3).forEach((channel, index) => {
          const analysis = channel.aiAnalysis;
          console.log(`${index + 1}. ${channel.title} - ${analysis.qualityScore}/10 - ${analysis.verdict}`);
        });
      }
      
      return { allResults, highQuality, educational };
      
    } catch (error) {
      console.error('❌ Ошибка AI фильтрации:', error);
      return null;
    }
  }

  /**
   * Полный тест всех функций
   */
  async runFullTest() {
    const testQueries = ['криптовалюты', 'психология', 'технологии'];
    
    console.log('🧪 ЗАПУСК ПОЛНОГО ТЕСТА AI ПОИСКА');
    console.log('='.repeat(70));
    
    for (const query of testQueries) {
      console.log(`\n🎯 ТЕСТИРОВАНИЕ ЗАПРОСА: "${query}"`);
      console.log('*'.repeat(50));
      
      // Быстрый поиск
      await this.testQuickSearch(query);
      
      // Ждем немного
      await this.delay(2000);
      
      // Умный поиск
      await this.testSmartSearch(query);
      
      // Ждем между разными запросами
      await this.delay(3000);
    }
    
    // Тест форматирования
    await this.testChatFormatting('bitcoin');
    
    // Тест фильтрации
    await this.testAIFiltering('образование');
    
    console.log('\n✅ ПОЛНОЕ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function runTests() {
  const tester = new AISearchTester();
  
  try {
    await tester.init();
    
    if (process.argv[2]) {
      // Если передан аргумент - тестируем конкретный запрос
      const query = process.argv.slice(2).join(' ');
      
      if (query === 'quick') {
        await tester.testQuickSearch('telegram');
      } else if (query === 'smart') {
        await tester.testSmartSearch('bitcoin');
      } else if (query === 'format') {
        await tester.testChatFormatting('психология');
      } else if (query === 'filter') {
        await tester.testAIFiltering('новости');
      } else {
        await tester.testSmartSearch(query);
      }
    } else {
      // Запускаем полное тестирование
      await tester.runFullTest();
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка тестирования:', error);
  }
}

console.log('🚀 AI SEARCH TESTER');
console.log('==================');
console.log('Использование:');
console.log('  node test-ai-search.js          - полный тест');
console.log('  node test-ai-search.js quick     - быстрый поиск');
console.log('  node test-ai-search.js smart     - умный поиск');
console.log('  node test-ai-search.js format    - тест форматирования');
console.log('  node test-ai-search.js filter    - тест фильтрации');
console.log('  node test-ai-search.js [запрос]  - поиск по запросу');
console.log('');

runTests();
