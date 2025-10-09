require('dotenv').config();

console.log('🧪 Тестирование модулей поискового движка...\n');

async function testModules() {
  try {
    // Тест 1: Импорт базового поискового движка
    console.log('📦 1. Тестирование TelegramSearchEngine...');
    const { TelegramSearchEngine } = require('./core/telegram-search-engine');
    const searchEngine = new TelegramSearchEngine();
    console.log('  ✅ TelegramSearchEngine создан успешно');
    
    // Тест 2: Импорт глобального поискового движка
    console.log('\n📦 2. Тестирование GlobalChannelFinder...');
    const { GlobalChannelFinder } = require('./core/global-channel-finder');
    const globalFinder = new GlobalChannelFinder();
    console.log('  ✅ GlobalChannelFinder создан успешно');
    
    // Тест 3: Тестирование категорий
    console.log('\n📦 3. Проверка категорий...');
    const categories = Object.keys(globalFinder.categories);
    console.log(`  ✅ Загружено ${categories.length} категорий:`);
    console.log(`  📋 Первые 5: ${categories.slice(0, 5).join(', ')}`);
    
    // Тест 4: Тестирование генерации вариаций поиска
    console.log('\n📦 4. Тестирование генерации поисковых вариаций...');
    const variations = globalFinder.generateSearchVariations('криптовалюты');
    console.log(`  ✅ Сгенерировано ${variations.length} вариаций:`);
    variations.forEach((v, i) => console.log(`    ${i + 1}. "${v}"`));
    
    // Тест 5: Импорт интеграции с ботом
    console.log('\n📦 5. Тестирование SearchBotIntegration...');
    const { SearchBotIntegration } = require('./core/search-bot-integration');
    console.log('  ✅ SearchBotIntegration импортирован успешно');
    
    // Тест 6: Тестирование базы данных
    console.log('\n📦 6. Тестирование Database...');
    const { Database } = require('./core/database');
    const db = new Database();
    console.log('  ✅ Database создана успешно');
    console.log(`  📄 Путь к БД: ${db.dbPath}`);
    
    // Тест 7: Проверка статистики
    console.log('\n📦 7. Проверка статистики...');
    const stats = globalFinder.getSearchStats();
    console.log('  ✅ Статистика получена:');
    console.log(`    • Размер кэша: ${stats.cacheSize}`);
    console.log(`    • Доступно категорий: ${stats.availableCategories}`);
    console.log(`    • Всего категорий: ${stats.totalCategories}`);
    
    console.log('\n🎉 Все модули работают корректно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании модулей:', error.message);
    console.error('📍 Подробности:', error.stack);
  }
}

testModules();


