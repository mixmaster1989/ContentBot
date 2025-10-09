require('dotenv').config();
const { ProfitPotokManager } = require('./core/profitpotok-manager');

async function testProfitPotokCloudLLM() {
  const manager = new ProfitPotokManager();
  
  try {
    console.log('🧪 ТЕСТ ПРОФИТПОТОК + CLOUD.RU LLM');
    console.log('===================================');
    
    // Инициализация
    await manager.init();
    
    // Тест Cloud.ru LLM
    await manager.testCloudRuLLM();
    
    console.log('\n🎉 ТЕСТ ЗАВЕРШЕН!');
    console.log('✅ Cloud.ru LLM интегрирован в модуль ProfitPotokManager!');
    
  } catch (error) {
    console.error('\n❌ ТЕСТ ПРОВАЛЕН:', error.message);
    console.error('Детали ошибки:', error);
  } finally {
    await manager.stop();
  }
}

// Запуск теста
if (require.main === module) {
  testProfitPotokCloudLLM().catch(console.error);
}

module.exports = { testProfitPotokCloudLLM };
