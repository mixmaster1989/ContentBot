require('dotenv').config();
const { ProfitPotokManager } = require('./core/profitpotok-manager');

async function testProfitPotokCryptoFolder() {
  const manager = new ProfitPotokManager();
  
  try {
    console.log('🧪 ТЕСТ МОДУЛЯ ПРОФИТПОТОК - ПАПКА КРИПТА');
    console.log('==========================================');
    
    // Инициализация
    await manager.init();
    
    // Тест просмотра папки КРИПТА
    await manager.testCryptoFolderView();
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!');
    console.log('✅ Модуль ProfitPotokManager видит папку КРИПТА');
    
  } catch (error) {
    console.error('\n❌ ТЕСТ ПРОВАЛЕН:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    await manager.stop();
  }
}

// Запуск теста
if (require.main === module) {
  testProfitPotokCryptoFolder().catch(console.error);
}

module.exports = { testProfitPotokCryptoFolder };
