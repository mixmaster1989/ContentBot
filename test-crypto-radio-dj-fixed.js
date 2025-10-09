require('dotenv').config();
const { CryptoRadioDJ } = require('./core/crypto-radio-dj-fixed');

async function testCryptoRadioDJ() {
  console.log('🎧 ТЕСТ КРИПТОРАДИО ДИДЖЕЯ (ИСПРАВЛЕННАЯ ВЕРСИЯ)');
  console.log('================================================');
  
  const dj = new CryptoRadioDJ();
  
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
