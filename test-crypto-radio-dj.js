require('dotenv').config();
const { CryptoRadioDJ } = require('./core/crypto-radio-dj');

async function testCryptoRadioDJ() {
  console.log('🎧 ТЕСТ КРИПТОРАДИО ДИДЖЕЯ');
  console.log('==========================');
  
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
