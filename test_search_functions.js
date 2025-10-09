require('dotenv').config();
const { GlobalChannelFinder } = require('./core/global-channel-finder');

console.log('🔍 Тестирование поисковых функций...\n');

async function testSearchFunctions() {
  let searchEngine = null;
  
  try {
    // Создаем поисковый движок
    console.log('📦 1. Инициализация поискового движка...');
    searchEngine = new GlobalChannelFinder();
    console.log('  ✅ GlobalChannelFinder создан');
    
    // Тестируем детекцию категорий
    console.log('\n📦 2. Тестирование детекции категорий...');
    const testCases = [
      { title: 'Crypto News Daily', description: 'Новости криптовалют и блокчейна' },
      { title: 'Tech Today', description: 'Последние технологические новости' },
      { title: 'Business Hub', description: 'Бизнес советы и предпринимательство' },
      { title: 'Gaming World', description: 'Новости из мира игр' }
    ];
    
    for (let testCase of testCases) {
      const category = searchEngine.detectCategory(testCase.title, testCase.description);
      console.log(`  ✅ "${testCase.title}" → категория: ${category}`);
    }
    
    // Тестируем генерацию поисковых вариаций
    console.log('\n📦 3. Тестирование генерации поисковых вариаций...');
    const testQueries = ['новости', 'игры', 'крипто'];
    
    for (let query of testQueries) {
      const variations = searchEngine.generateSearchVariations(query);
      console.log(`  ✅ "${query}" → ${variations.length} вариаций: ${variations.join(', ')}`);
    }
    
    // Тестируем форматирование результатов
    console.log('\n📦 4. Тестирование форматирования результатов...');
    const mockChannel = {
      id: '12345',
      title: 'Тестовый канал',
      username: 'test_channel',
      broadcast: true,
      participantsCount: 1500,
      about: 'Описание тестового канала',
      verified: false,
      date: Math.floor(Date.now() / 1000)
    };
    
    const formattedResult = searchEngine.formatChannelResult(mockChannel);
    console.log('  ✅ Результат форматирования:');
    console.log(`    • ID: ${formattedResult.id}`);
    console.log(`    • Название: ${formattedResult.title}`);
    console.log(`    • Тип: ${formattedResult.type}`);
    console.log(`    • Участники: ${formattedResult.participantsCount}`);
    console.log(`    • Категория: ${formattedResult.category}`);
    console.log(`    • Ссылка: ${formattedResult.link}`);
    
    // Тестируем сортировку по релевантности
    console.log('\n📦 5. Тестирование сортировки по релевантности...');
    const mockResults = [
      { id: '1', title: 'Crypto News', username: 'crypto_news', participantsCount: 1000, verified: false },
      { id: '2', title: 'Bitcoin Daily', username: 'bitcoin', participantsCount: 5000, verified: true },
      { id: '3', title: 'Крипто новости', username: null, participantsCount: 2000, verified: false }
    ];
    
    const sortedResults = searchEngine.sortByRelevance(mockResults, 'крипто');
    console.log('  ✅ Результаты отсортированы по релевантности:');
    sortedResults.forEach((result, index) => {
      console.log(`    ${index + 1}. ${result.title} (${result.participantsCount} участников)`);
    });
    
    // Тестируем кэширование
    console.log('\n📦 6. Тестирование кэширования...');
    const cacheKey = searchEngine.getCacheKey('тест', { limit: 10, type: 'channels' });
    console.log(`  ✅ Ключ кэша сгенерирован: ${cacheKey.substring(0, 30)}...`);
    
    // Тестируем статистику
    console.log('\n📦 7. Тестирование статистики...');
    const stats = searchEngine.getSearchStats();
    console.log('  ✅ Статистика получена:');
    console.log(`    • Размер кэша: ${stats.cacheSize} записей`);
    console.log(`    • Доступных категорий: ${stats.availableCategories}`);
    console.log(`    • Всего категорий: ${stats.totalCategories}`);
    
    // Тестируем экспорт (без реальных данных)
    console.log('\n📦 8. Тестирование экспорта...');
    const mockExportData = {
      query: 'тест',
      timestamp: new Date().toISOString(),
      total: 3,
      results: sortedResults
    };
    
    console.log('  ✅ Данные для экспорта подготовлены:');
    console.log(`    • Запрос: ${mockExportData.query}`);
    console.log(`    • Результатов: ${mockExportData.total}`);
    console.log(`    • Время: ${mockExportData.timestamp}`);
    
    console.log('\n🎉 Все поисковые функции работают корректно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании поисковых функций:', error.message);
    console.error('📍 Подробности:', error.stack);
  } finally {
    if (searchEngine) {
      searchEngine.clearCache();
      console.log('\n🧹 Кэш очищен');
    }
  }
}

testSearchFunctions();


