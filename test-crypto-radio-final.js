require('dotenv').config();
const { CryptoRadioDJ } = require('./core/crypto-radio-dj-final');

async function testCryptoRadioDJ() {
  console.log('🎧 ТЕСТ КРИПТОРАДИО ДИДЖЕЯ (ФИНАЛЬНАЯ ВЕРСИЯ)');
  console.log('==============================================');
  
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
