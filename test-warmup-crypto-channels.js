require('dotenv').config();
const { ProfitPotokManager } = require('./core/profitpotok-manager');

async function testWarmupCryptoChannels() {
  const manager = new ProfitPotokManager();
  
  try {
    console.log('🧪 ТЕСТ ПРОГРЕВА КАНАЛОВ ПАПКИ КРИПТА');
    console.log('=====================================');
    
    // Инициализация
    await manager.init();
    
    // Тест прогрева каналов
    await manager.testWarmupCryptoChannels();
    
    console.log('\n🎉 ТЕСТ ЗАВЕРШЕН!');
    console.log('🔥 Каналы папки КРИПТА прогреты и готовы к получению апдейтов!');
    
  } catch (error) {
    console.error('\n❌ ТЕСТ ПРОВАЛЕН:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    await manager.stop();
  }
}

// Запуск теста
if (require.main === module) {
  testWarmupCryptoChannels().catch(console.error);
}

module.exports = { testWarmupCryptoChannels };
