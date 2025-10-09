require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

class AntilopaEventTest {
  constructor() {
    // Меняем рабочую директорию как в goodnight-message.js
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.antilopaGroupId = -1002686615681;
  }

  async init() {
    try {
      console.log('🔍 Тест событий для группы АНТИЛОПА...');
      
      await this.mt.start();
      console.log('✅ MTProto клиент подключен');
      
      // Слушаем ВСЕ события
      this.client.addEventHandler(async (update) => {
        try {
          console.log(`📩 СОБЫТИЕ: ${update.className}`);
          
          if (update instanceof Api.UpdateNewMessage || update instanceof Api.UpdateNewChannelMessage) {
            const message = update.message;
            console.log(`📝 СООБЩЕНИЕ: ID=${message.id}, PeerType=${message.peerId?.className}, ChannelID=${message.peerId?.channelId}, Text="${(message.message || '').substring(0, 50)}..."`);
            
            // Проверяем на группу АНТИЛОПА
            if (message.peerId?.className === 'PeerChannel') {
              const channelId = String(message.peerId.channelId?.value ?? message.peerId.channelId);
              const targetId = Math.abs(this.antilopaGroupId).toString();
              
              console.log(`🔍 Channel ID: ${channelId}, Target: ${targetId}, Match: ${channelId === targetId}`);
              
              if (channelId === targetId) {
                console.log(`🎯 *** СООБЩЕНИЕ ИЗ АНТИЛОПА! *** Text: "${message.message}"`);
              }
            }
          }
        } catch (error) {
          console.error('❌ Ошибка обработки события:', error);
        }
      });
      
      console.log('✅ Слушаю ВСЕ события Telegram...');
      console.log('💬 Напишите что-нибудь в любом чате/группе для проверки');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }
}

async function testEvents() {
  const test = new AntilopaEventTest();
  
  try {
    await test.init();
    
    // Graceful shutdown
    process.once('SIGINT', () => {
      console.log('\n🛑 Тест остановлен');
      process.exit(0);
    });
    
    // Отправляем тестовое сообщение в АНТИЛОПА
    setTimeout(async () => {
      try {
        await test.client.sendMessage(test.antilopaGroupId, { 
          message: '🧪 ТЕСТ СОБЫТИЙ - это автоматическое сообщение для проверки'
        });
        console.log('📤 Отправил тестовое сообщение в АНТИЛОПА');
      } catch (error) {
        console.log('❌ Ошибка отправки тестового сообщения:', error.message);
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

testEvents();
