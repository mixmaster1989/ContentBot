require('dotenv').config();
const { ProfitPotokManager } = require('./core/profitpotok-manager');

async function testProfitPotokModule() {
  const manager = new ProfitPotokManager();
  
  try {
    console.log('🧪 ТЕСТ МОДУЛЯ ПРОФИТПОТОК');
    console.log('============================');
    
    // Инициализация
    await manager.init();
    
    // Запуск теста: отправка и удаление поста
    await manager.testPostAndDelete();
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
    console.log('✅ Модуль ProfitPotokManager работает корректно');
    
  } catch (error) {
    console.error('\n❌ ТЕСТ ПРОВАЛЕН:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    await manager.stop();
  }
}

// Запуск теста
if (require.main === module) {
  testProfitPotokModule().catch(console.error);
}

module.exports = { testProfitPotokModule };
