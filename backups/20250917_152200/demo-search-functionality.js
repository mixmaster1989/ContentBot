require('dotenv').config();
const { GlobalChannelFinder } = require('./core/global-channel-finder');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const fs = require('fs').promises;
const path = require('path');

class SearchDemo {
  constructor() {
    this.searchEngine = new GlobalChannelFinder();
    this.demoResults = {};
  }

  async init() {
    try {
      console.log('🚀 Инициализация демо поискового модуля...');
      
      // Подключаем MTProto клиент
      const mtClient = MTProtoClient.get();
      const client = mtClient.getClient();
      await client.connect();
      
      // Инициализируем поисковый движок
      await this.searchEngine.init(client);
      
      console.log('✅ Демо поисковый модуль готов к работе!');
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
    }
  }

  async runDemo() {
    try {
      console.log('\n🎯 Запуск демонстрации поискового модуля...\n');
      
      // 1. Базовый поиск
      await this.demoBasicSearch();
      
      // 2. Поиск по категориям
      await this.demoCategorySearch();
      
      // 3. Расширенный поиск
      await this.demoAdvancedSearch();
      
      // 4. Интеллектуальный поиск
      await this.demoIntelligentSearch();
      
      // 5. Трендовые каналы
      await this.demoTrendingChannels();
      
      // 6. Экспорт результатов
      await this.demoExportFeatures();
      
      // 7. Статистика
      await this.demoStatistics();
      
      // Сохраняем результаты демо
      await this.saveResults();
      
      console.log('\n🎉 Демонстрация завершена! Результаты сохранены в demo_results.json');
      
    } catch (error) {
      console.error('❌ Ошибка в демо:', error);
    }
  }

  async demoBasicSearch() {
    console.log('📍 1. БАЗОВЫЙ ПОИСК КАНАЛОВ');
    console.log('=' .repeat(50));
    
    const queries = ['крипто', 'новости', 'технологии', 'бизнес'];
    
    for (let query of queries) {
      try {
        console.log(`\n🔍 Поиск: "${query}"`);
        
        const results = await this.searchEngine.searchChannels(query, {
          limit: 5,
          type: 'all',
          minParticipants: 1000
        });
        
        this.demoResults[`basic_search_${query}`] = {
          query,
          count: results.length,
          results: results.slice(0, 3) // Топ-3 для демо
        };
        
        console.log(`📊 Найдено: ${results.length} каналов`);
        
        if (results.length > 0) {
          console.log('🏆 Топ-3 результата:');
          for (let i = 0; i < Math.min(3, results.length); i++) {
            const r = results[i];
            console.log(`  ${i + 1}. ${r.title}`);
            console.log(`     👥 ${r.participantsCount?.toLocaleString('ru-RU') || 'Неизвестно'} участников`);
            console.log(`     🏷️ ${r.category}`);
            console.log(`     🔗 ${r.link || 'Без ссылки'}`);
            console.log('');
          }
        }
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`❌ Ошибка поиска "${query}":`, error.message);
      }
    }
  }

  async demoCategorySearch() {
    console.log('\n📍 2. ПОИСК ПО КАТЕГОРИЯМ');
    console.log('=' .repeat(50));
    
    const categories = ['технологии', 'финансы', 'новости', 'игры'];
    
    for (let category of categories) {
      try {
        console.log(`\n🏷️ Категория: "${category}"`);
        
        const recommendations = await this.searchEngine.getRecommendedChannels(category, 5);
        
        this.demoResults[`category_${category}`] = {
          category,
          count: recommendations.length,
          channels: recommendations
        };
        
        console.log(`📊 Рекомендуемых каналов: ${recommendations.length}`);
        
        if (recommendations.length > 0) {
          console.log('🌟 Рекомендации:');
          for (let rec of recommendations.slice(0, 3)) {
            console.log(`  • ${rec.channel_title}`);
            console.log(`    👥 ${rec.participants_count?.toLocaleString('ru-RU') || 'Неизвестно'} участников`);
            if (rec.channel_username) {
              console.log(`    🔗 @${rec.channel_username}`);
            }
            console.log('');
          }
        }
        
      } catch (error) {
        console.log(`❌ Ошибка категории "${category}":`, error.message);
      }
    }
  }

  async demoAdvancedSearch() {
    console.log('\n📍 3. РАСШИРЕННЫЙ ПОИСК');
    console.log('=' .repeat(50));
    
    try {
      console.log('🎯 Поиск с множественными критериями...');
      
      const advancedCriteria = {
        keywords: ['блокчейн', 'деф', 'нфт'],
        categories: ['криптовалюты', 'финансы', 'технологии'],
        minParticipants: 5000,
        maxParticipants: 100000,
        verifiedOnly: false,
        hasUsername: true,
        type: 'channels',
        limit: 10
      };
      
      const results = await this.searchEngine.advancedSearch(advancedCriteria);
      
      this.demoResults.advanced_search = {
        criteria: advancedCriteria,
        count: results.length,
        results: results.slice(0, 5)
      };
      
      console.log(`📊 Найдено: ${results.length} каналов`);
      console.log('🔍 Критерии поиска:');
      console.log(`  • Ключевые слова: ${advancedCriteria.keywords.join(', ')}`);
      console.log(`  • Категории: ${advancedCriteria.categories.join(', ')}`);
      console.log(`  • Участники: ${advancedCriteria.minParticipants}-${advancedCriteria.maxParticipants}`);
      console.log(`  • Только каналы с username`);
      
      if (results.length > 0) {
        console.log('\n🎯 Найденные каналы:');
        for (let result of results.slice(0, 5)) {
          console.log(`  • ${result.title}`);
          console.log(`    👥 ${result.participantsCount?.toLocaleString('ru-RU')} участников`);
          console.log(`    🏷️ ${result.category}`);
          console.log(`    🔗 @${result.username}`);
          console.log('');
        }
      }
      
    } catch (error) {
      console.log('❌ Ошибка расширенного поиска:', error.message);
    }
  }

  async demoIntelligentSearch() {
    console.log('\n📍 4. ИНТЕЛЛЕКТУАЛЬНЫЙ ПОИСК');
    console.log('=' .repeat(50));
    
    try {
      console.log('🧠 Поиск с использованием синонимов и переводов...');
      
      const query = 'криптовалюты';
      
      // Показываем вариации запроса
      const variations = this.searchEngine.generateSearchVariations(query);
      console.log(`🔄 Генерируемые вариации для "${query}":`);
      for (let variation of variations.slice(0, 5)) {
        console.log(`  • "${variation}"`);
      }
      
      const results = await this.searchEngine.intelligentSearch(query, {
        maxResults: 15,
        timeout: 25000
      });
      
      this.demoResults.intelligent_search = {
        originalQuery: query,
        variations: variations,
        count: results.length,
        results: results.slice(0, 5)
      };
      
      console.log(`\n📊 Интеллектуальный поиск нашел: ${results.length} каналов`);
      
      if (results.length > 0) {
        console.log('\n🧠 Результаты с учетом синонимов:');
        for (let result of results.slice(0, 5)) {
          console.log(`  • ${result.title}`);
          console.log(`    🏷️ ${result.category}`);
          console.log(`    👥 ${result.participantsCount?.toLocaleString('ru-RU') || 'Неизвестно'} участников`);
          if (result.sources) {
            console.log(`    🔍 Источники: ${result.sources.join(', ')}`);
          }
          console.log('');
        }
      }
      
    } catch (error) {
      console.log('❌ Ошибка интеллектуального поиска:', error.message);
    }
  }

  async demoTrendingChannels() {
    console.log('\n📍 5. ТРЕНДОВЫЕ КАНАЛЫ');
    console.log('=' .repeat(50));
    
    try {
      console.log('📈 Получение трендовых каналов...');
      
      const trends24h = await this.searchEngine.getTrendingChannels(null, '24h');
      const trendsWeek = await this.searchEngine.getTrendingChannels(null, '7d');
      
      this.demoResults.trending = {
        last24h: trends24h.slice(0, 5),
        lastWeek: trendsWeek.slice(0, 5)
      };
      
      console.log(`📊 Трендов за 24 часа: ${trends24h.length}`);
      console.log(`📊 Трендов за неделю: ${trendsWeek.length}`);
      
      if (trends24h.length > 0) {
        console.log('\n🔥 Топ-5 трендов за 24 часа:');
        for (let i = 0; i < Math.min(5, trends24h.length); i++) {
          const trend = trends24h[i];
          console.log(`  ${i + 1}. ${trend.channel_title}`);
          console.log(`     🔥 ${trend.search_frequency} поисков`);
          console.log(`     👥 ${trend.participants_count?.toLocaleString('ru-RU') || 'Неизвестно'} участников`);
          console.log(`     🏷️ ${trend.category}`);
          console.log('');
        }
      }
      
    } catch (error) {
      console.log('❌ Ошибка получения трендов:', error.message);
    }
  }

  async demoExportFeatures() {
    console.log('\n📍 6. ЭКСПОРТ РЕЗУЛЬТАТОВ');
    console.log('=' .repeat(50));
    
    try {
      console.log('💾 Демонстрация экспорта в разных форматах...');
      
      const query = 'технологии';
      
      // JSON экспорт
      const jsonExport = await this.searchEngine.exportResults(query, 'json', {
        maxResults: 10,
        timeout: 15000
      });
      
      // CSV экспорт
      const csvExport = await this.searchEngine.exportResults(query, 'csv', {
        maxResults: 10,
        timeout: 15000
      });
      
      // Markdown экспорт
      const markdownExport = await this.searchEngine.exportResults(query, 'markdown', {
        maxResults: 5,
        timeout: 15000
      });
      
      this.demoResults.export_demo = {
        query,
        formats: {
          json: jsonExport ? 'Успешно' : 'Ошибка',
          csv: csvExport ? 'Успешно' : 'Ошибка',
          markdown: markdownExport ? 'Успешно' : 'Ошибка'
        }
      };
      
      console.log('📊 Результаты экспорта:');
      console.log(`  • JSON: ${jsonExport ? '✅ Готов' : '❌ Ошибка'}`);
      console.log(`  • CSV: ${csvExport ? '✅ Готов' : '❌ Ошибка'}`);
      console.log(`  • Markdown: ${markdownExport ? '✅ Готов' : '❌ Ошибка'}`);
      
      if (jsonExport && jsonExport.results) {
        console.log(`  • Экспортировано каналов: ${jsonExport.total}`);
        console.log(`  • Дата экспорта: ${jsonExport.timestamp}`);
      }
      
      // Сохраняем примеры экспорта
      if (markdownExport) {
        await fs.writeFile(
          path.join(__dirname, 'demo_export_example.md'),
          markdownExport
        );
        console.log('  • Пример Markdown сохранен в demo_export_example.md');
      }
      
    } catch (error) {
      console.log('❌ Ошибка демо экспорта:', error.message);
    }
  }

  async demoStatistics() {
    console.log('\n📍 7. СТАТИСТИКА И АНАЛИТИКА');
    console.log('=' .repeat(50));
    
    try {
      console.log('📊 Статистика поискового модуля...');
      
      const stats = this.searchEngine.getSearchStats();
      
      this.demoResults.statistics = {
        searchStats: stats,
        categoriesCount: Object.keys(this.searchEngine.categories).length,
        availableCategories: Object.keys(this.searchEngine.categories)
      };
      
      console.log('📈 Общая статистика:');
      console.log(`  • Размер кэша: ${stats.cacheSize} записей`);
      console.log(`  • Доступно категорий: ${stats.availableCategories}`);
      console.log(`  • Всего категорий: ${stats.totalCategories}`);
      
      console.log('\n🏷️ Доступные категории:');
      const categories = Object.keys(this.searchEngine.categories);
      for (let i = 0; i < categories.length; i += 4) {
        const line = categories.slice(i, i + 4).join(', ');
        console.log(`  ${line}`);
      }
      
      // Популярные запросы (демо данные)
      console.log('\n🔥 Популярные поисковые запросы:');
      const popularQueries = [
        { query: 'криптовалюты', count: 45 },
        { query: 'новости', count: 38 },
        { query: 'технологии', count: 32 },
        { query: 'бизнес', count: 28 },
        { query: 'игры', count: 24 }
      ];
      
      for (let pop of popularQueries) {
        console.log(`  • "${pop.query}" - ${pop.count} поисков`);
      }
      
    } catch (error) {
      console.log('❌ Ошибка получения статистики:', error.message);
    }
  }

  async saveResults() {
    try {
      const resultsFile = path.join(__dirname, 'demo_results.json');
      
      const finalResults = {
        timestamp: new Date().toISOString(),
        summary: {
          totalSearches: Object.keys(this.demoResults).length,
          featuresDemo: [
            'Базовый поиск каналов',
            'Поиск по категориям',
            'Расширенный поиск с фильтрами',
            'Интеллектуальный поиск с синонимами',
            'Трендовые каналы',
            'Экспорт в разных форматах',
            'Статистика и аналитика'
          ]
        },
        results: this.demoResults
      };
      
      await fs.writeFile(resultsFile, JSON.stringify(finalResults, null, 2));
      
      // Также создаем краткий отчет
      const reportFile = path.join(__dirname, 'demo_report.md');
      const report = this.generateMarkdownReport(finalResults);
      await fs.writeFile(reportFile, report);
      
      console.log('\n💾 Результаты сохранены:');
      console.log(`  • ${resultsFile}`);
      console.log(`  • ${reportFile}`);
      
    } catch (error) {
      console.error('❌ Ошибка сохранения результатов:', error);
    }
  }

  generateMarkdownReport(results) {
    let report = `# Демонстрация поискового модуля ContentBot\n\n`;
    report += `**Дата:** ${new Date().toLocaleDateString('ru-RU')}\n`;
    report += `**Время:** ${new Date().toLocaleTimeString('ru-RU')}\n\n`;
    
    report += `## 🎯 Обзор функций\n\n`;
    for (let feature of results.summary.featuresDemo) {
      report += `- ✅ ${feature}\n`;
    }
    
    report += `\n## 📊 Результаты демонстрации\n\n`;
    
    // Базовый поиск
    report += `### 🔍 Базовый поиск\n\n`;
    const basicSearches = Object.keys(results.results).filter(k => k.startsWith('basic_search_'));
    for (let key of basicSearches) {
      const data = results.results[key];
      report += `**Запрос:** "${data.query}"\n`;
      report += `**Найдено:** ${data.count} каналов\n\n`;
    }
    
    // Категории
    report += `### 🏷️ Поиск по категориям\n\n`;
    const categories = Object.keys(results.results).filter(k => k.startsWith('category_'));
    for (let key of categories) {
      const data = results.results[key];
      report += `**Категория:** "${data.category}"\n`;
      report += `**Рекомендаций:** ${data.count}\n\n`;
    }
    
    // Статистика
    if (results.results.statistics) {
      report += `### 📈 Статистика модуля\n\n`;
      report += `- **Доступно категорий:** ${results.results.statistics.categoriesCount}\n`;
      report += `- **Размер кэша:** ${results.results.statistics.searchStats.cacheSize} записей\n\n`;
    }
    
    report += `## 🚀 Заключение\n\n`;
    report += `Поисковый модуль успешно демонстрирует возможности:\n`;
    report += `- Глобального поиска по Telegram каналам и группам\n`;
    report += `- Интеллектуальной фильтрации и категоризации\n`;
    report += `- Экспорта результатов в различных форматах\n`;
    report += `- Аналитики и трендов\n\n`;
    report += `Модуль готов к интеграции в основной бот ContentBot.`;
    
    return report;
  }
}

// Запуск демо
async function runSearchDemo() {
  const demo = new SearchDemo();
  
  try {
    await demo.init();
    await demo.runDemo();
  } catch (error) {
    console.error('❌ Критическая ошибка демо:', error);
  } finally {
    console.log('\n👋 Демонстрация завершена!');
    process.exit(0);
  }
}

if (require.main === module) {
  runSearchDemo();
}

module.exports = { SearchDemo };
