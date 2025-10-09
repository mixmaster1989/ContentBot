require('dotenv').config();
const { ProfitPotokManager } = require('./core/profitpotok-manager');

async function testCryptoMessages() {
  const manager = new ProfitPotokManager();
  
  try {
    console.log('🧪 ТЕСТ ПОЛУЧЕНИЯ СООБЩЕНИЙ ИЗ ПАПКИ КРИПТА');
    console.log('============================================');
    
    // Инициализация
    await manager.init();
    
    // Тест получения сообщений
    await manager.testCryptoFolderMessages();
    
    console.log('\n🎉 ТЕСТ ЗАВЕРШЕН!');
    
  } catch (error) {
    console.error('\n❌ ТЕСТ ПРОВАЛЕН:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    await manager.stop();
  }
}

// Запуск теста
if (require.main === module) {
  testCryptoMessages().catch(console.error);
}

module.exports = { testCryptoMessages };
