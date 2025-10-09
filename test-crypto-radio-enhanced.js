require('dotenv').config();
const { CryptoRadioDJEnhanced } = require('./crypto-radio-dj-enhanced');

async function testCryptoRadioDJ() {
  console.log('🎧 ТЕСТ УЛУЧШЕННОГО КРИПТОРАДИО ДИДЖЕЯ');
  console.log('=======================================');
  
  const dj = new CryptoRadioDJEnhanced();
  
  try {
    await dj.init();
    await dj.createPodcast();
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  } finally {
    await dj.stop();
  }
}

testCryptoRadioDJ();
