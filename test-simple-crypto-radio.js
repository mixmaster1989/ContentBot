require('dotenv').config();
const { MTProtoClient } = require('../../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');
const axios = require('axios');
const fs = require('fs');

async function testSimpleCryptoRadio() {
  console.log('🎧 ПРОСТОЙ ТЕСТ КРИПТОРАДИО');
  console.log('===========================');
  
  const mt = MTProtoClient.get();
  const client = mt.getClient();
  
  try {
    await mt.start();
    await client.connect();
    console.log('✅ Telegram клиент подключен');
    
    // Получаем папку КРИПТА
    console.log('🔍 Получаю папку КРИПТА...');
    const dialogFilters = await client.invoke(new Api.messages.GetDialogFilters());
    const cryptoFilter = dialogFilters.filters.find(filter => filter.title === 'КРИПТА');
    
    if (!cryptoFilter) {
      console.log('❌ Папка КРИПТА не найдена');
      return;
    }
    
    console.log(`✅ Папка КРИПТА найдена: "${cryptoFilter.title}" (ID: ${cryptoFilter.id})`);
    console.log(`📊 Каналов в папке: ${cryptoFilter.includePeers.length}`);
    
    // Показываем первые 5 каналов
    console.log('\n📋 ПЕРВЫЕ 5 КАНАЛОВ:');
    for (let i = 0; i < Math.min(5, cryptoFilter.includePeers.length); i++) {
      try {
        const peer = cryptoFilter.includePeers[i];
        const channelEntity = await client.getEntity(peer);
        console.log(`${i + 1}. ${channelEntity.title} (ID: ${channelEntity.id})`);
        
        // Получаем 3 последних сообщения
        const messages = await client.invoke(
          new Api.messages.GetHistory({
            peer: channelEntity,
            limit: 3,
            offsetDate: 0,
            offsetId: 0,
            minId: 0,
            maxId: 0,
            addOffset: 0
          })
        );
        
        console.log(`   📝 Последние сообщения:`);
        messages.messages.forEach((msg, idx) => {
          if (msg.message) {
            const date = new Date(msg.date * 1000);
            console.log(`   ${idx + 1}. [${date.toISOString()}] ${msg.message.substring(0, 100)}...`);
          }
        });
        console.log('');
        
      } catch (error) {
        console.error(`❌ Ошибка с каналом ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('🎧 Тест завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error.message);
  } finally {
    await client.disconnect();
  }
}

testSimpleCryptoRadio();
