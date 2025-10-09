require('dotenv').config();
const { Database } = require('./core/database');

console.log('🗄️ Тестирование базы данных...\n');

async function testDatabase() {
  let db = null;
  
  try {
    // Создаем и инициализируем базу данных
    console.log('📦 1. Создание базы данных...');
    db = new Database();
    await db.init();
    console.log('  ✅ База данных инициализирована');
    
    // Тест создания пользователя
    console.log('\n📦 2. Тестирование создания пользователя...');
    const testUserId = 123456789;
    const user = await db.createUser(testUserId, 'test_user', 'Test User');
    console.log('  ✅ Пользователь создан:', user ? 'Успешно' : 'Ошибка');
    
    // Тест получения пользователя
    console.log('\n📦 3. Тестирование получения пользователя...');
    const fetchedUser = await db.getUser(testUserId);
    console.log('  ✅ Пользователь получен:', fetchedUser ? `ID: ${fetchedUser.telegram_id}` : 'Не найден');
    
    // Тест создания канала
    console.log('\n📦 4. Тестирование создания канала...');
    const channelResult = await db.createChannel(
      testUserId, 
      '@test_channel', 
      'Тестовый канал',
      'технологии',
      'современный'
    );
    console.log('  ✅ Канал создан:', channelResult ? 'Успешно' : 'Ошибка');
    
    // Тест получения каналов пользователя
    console.log('\n📦 5. Тестирование получения каналов...');
    const userChannels = await db.getUserChannels(testUserId);
    console.log(`  ✅ Каналов пользователя: ${userChannels.length}`);
    
    // Тест сохранения результатов поиска (через поисковый движок)
    console.log('\n📦 6. Тестирование поисковых таблиц...');
    const { TelegramSearchEngine } = require('./core/telegram-search-engine');
    const searchEngine = new TelegramSearchEngine();
    await searchEngine.init(null); // Инициализируем без MTProto клиента для теста
    console.log('  ✅ Поисковые таблицы созданы');
    
    // Тест сохранения истории поиска
    console.log('\n📦 7. Тестирование сохранения истории поиска...');
    await searchEngine.saveSearchHistory(testUserId, 'тестовый запрос', 5);
    const history = await searchEngine.getUserSearchHistory(testUserId, 5);
    console.log(`  ✅ История поиска: ${history.length} записей`);
    
    // Тест статистики
    console.log('\n📦 8. Тестирование общей статистики...');
    const totalStats = await db.getTotalStats();
    console.log('  ✅ Общая статистика:');
    console.log(`    • Пользователей: ${totalStats.total_users}`);
    console.log(`    • Каналов: ${totalStats.total_channels}`);
    console.log(`    • Постов: ${totalStats.total_posts}`);
    console.log(`    • Доход: ${totalStats.total_revenue}₽`);
    
    console.log('\n🎉 База данных работает корректно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании базы данных:', error.message);
    console.error('📍 Подробности:', error.stack);
  } finally {
    // Закрываем соединение с БД
    if (db) {
      await db.close();
      console.log('\n🛑 Соединение с базой данных закрыто');
    }
  }
}

testDatabase();


