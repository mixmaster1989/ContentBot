require('dotenv').config();
const { AntilopaSearchMonitor } = require('./antilopa-search-monitor');

console.log('🧪 ТЕСТИРОВАНИЕ МОНИТОРИНГА ГРУППЫ АНТИЛОПА');
console.log('==========================================');

async function testAntilopaMonitor() {
  let monitor = null;
  
  try {
    console.log('\n1️⃣ Создание мониторинга...');
    monitor = new AntilopaSearchMonitor();
    console.log('✅ Мониторинг создан');
    
    console.log('\n2️⃣ Тестирование подключения...');
    await monitor.init();
    console.log('✅ Подключение установлено');
    
    console.log('\n3️⃣ Информация о группе АНТИЛОПА...');
    if (monitor.antilopaGroupId) {
      console.log(`✅ Группа найдена, ID: ${monitor.antilopaGroupId}`);
    } else {
      console.log('❌ Группа АНТИЛОПА не найдена');
    }
    
    console.log('\n4️⃣ Тестирование извлечения поискового запроса...');
    const testMessages = [
      'ПОИСК ПО ТЕЛЕГЕ криптовалюты',
      'Привет! ПОИСК ПО ТЕЛЕГЕ новости технологии',
      'поиск по телеге игры',
      'ПОИСК ПО ТЕЛЕГЕ',
      'Обычное сообщение без поиска'
    ];
    
    for (let testMsg of testMessages) {
      const query = monitor.extractSearchQuery(testMsg);
      console.log(`  "${testMsg}" → запрос: "${query || 'не найден'}"`);
    }
    
    console.log('\n5️⃣ Тестирование поискового движка...');
    const testQuery = 'технологии';
    console.log(`Тестовый поиск: "${testQuery}"`);
    
    const results = await monitor.searchEngine.searchChannels(testQuery, {
      limit: 3,
      useCache: true
    });
    console.log(`✅ Найдено ${results.length} результатов (тестовый поиск)`);
    
    console.log('\n6️⃣ Статистика мониторинга...');
    const stats = await monitor.getStats();
    console.log('✅ Статистика получена:');
    console.log(`  • Запущен: ${stats.isRunning}`);
    console.log(`  • Группа: ${stats.antilopaGroupId}`);
    console.log(`  • Триггер: "${stats.triggerPhrase}"`);
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('\n💡 Готов к запуску через PM2:');
    console.log('   chmod +x start_pm2.sh && ./start_pm2.sh');
    
  } catch (error) {
    console.error('\n❌ ОШИБКА В ТЕСТАХ:', error.message);
    console.error('📍 Подробности:', error.stack);
  } finally {
    if (monitor) {
      await monitor.stop();
      console.log('\n🛑 Тестовое подключение закрыто');
    }
  }
}

// Запуск тестов
testAntilopaMonitor();


