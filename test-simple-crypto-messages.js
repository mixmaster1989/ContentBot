require('dotenv').config();
const { ProfitPotokManager } = require('./core/profitpotok-manager');

async function testSimpleCryptoMessages() {
  const manager = new ProfitPotokManager();
  
  try {
    console.log('🧪 ПРОСТОЙ ТЕСТ ПОЛУЧЕНИЯ СООБЩЕНИЙ');
    console.log('===================================');
    
    // Инициализация
    await manager.init();
    
    // Получаем папку КРИПТА
    console.log('\n🔍 Получаем папку КРИПТА...');
    const cryptoFolder = await manager.viewCryptoFolder();
    
    if (cryptoFolder && cryptoFolder.channels.length > 0) {
      console.log(`\n✅ Папка КРИПТА найдена с ${cryptoFolder.channels.length} каналами`);
      
      // Пробуем получить сообщения из первого канала
      const firstChannel = cryptoFolder.channels[0];
      console.log(`\n📺 Тестируем получение сообщений из: ${firstChannel.title}`);
      
      try {
        // Пробуем получить сообщения напрямую через API
        const { Api } = require('telegram');
        
        let inputPeer;
        if (firstChannel.isChannel) {
          inputPeer = new Api.InputPeerChannel({
            channelId: firstChannel.id,
            accessHash: 0n
          });
        } else {
          inputPeer = new Api.InputPeerChat({
            chatId: firstChannel.id
          });
        }
        
        console.log('📨 Запрашиваем последние 3 сообщения...');
        
        const history = await manager.client.invoke(
          new Api.messages.GetHistory({
            peer: inputPeer,
            limit: 3,
            offsetDate: 0,
            offsetId: 0,
            maxId: 0,
            minId: 0,
            addOffset: 0,
            hash: 0n
          })
        );
        
        if (history.messages && history.messages.length > 0) {
          console.log(`✅ Получено ${history.messages.length} сообщений!`);
          
          history.messages.forEach((msg, index) => {
            if (msg.message) {
              console.log(`\n📝 Сообщение ${index + 1}:`);
              console.log(`   ID: ${msg.id}`);
              console.log(`   Дата: ${new Date(msg.date * 1000).toLocaleString('ru-RU')}`);
              console.log(`   Текст: ${msg.message.substring(0, 150)}...`);
            }
          });
        } else {
          console.log('⚠️ Сообщения не найдены');
        }
        
      } catch (error) {
        console.log(`❌ Ошибка получения сообщений: ${error.message}`);
      }
      
    } else {
      console.log('❌ Папка КРИПТА не найдена или пуста');
    }
    
    console.log('\n🎉 ТЕСТ ЗАВЕРШЕН!');
    
  } catch (error) {
    console.error('\n❌ ТЕСТ ПРОВАЛЕН:', error.message);
  } finally {
    await manager.stop();
  }
}

// Запуск теста
if (require.main === module) {
  testSimpleCryptoMessages().catch(console.error);
}

module.exports = { testSimpleCryptoMessages };
