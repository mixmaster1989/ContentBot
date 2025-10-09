require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');

class DirectAntilopaTest {
  constructor() {
    // Меняем рабочую директорию как в goodnight-message.js
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.antilopaGroupId = -1002686615681;
  }

  async init() {
    try {
      console.log('🔍 Прямой тест сообщений АНТИЛОПА...');
      
      await this.mt.start();
      console.log('✅ MTProto клиент подключен');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async testDirectMessages() {
    try {
      console.log('📬 Получаю последние сообщения из группы АНТИЛОПА...');
      
      // Получаем последние 20 сообщений
      const messages = await this.client.getMessages(this.antilopaGroupId, { 
        limit: 20
      });
      
      console.log(`📋 Найдено ${messages.length} сообщений:`);
      console.log('='.repeat(60));
      
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        console.log(`${i + 1}. Сообщение #${message.id}`);
        console.log(`   📅 Дата: ${new Date(message.date * 1000).toLocaleString('ru-RU')}`);
        console.log(`   👤 От нас: ${message.out ? 'ДА' : 'НЕТ'}`);
        console.log(`   💬 Текст: "${(message.message || 'БЕЗ ТЕКСТА').substring(0, 100)}"`);
        console.log(`   🆔 Peer: ${message.peerId?.className}, ID: ${message.peerId?.channelId}`);
        
        // Проверяем на поисковую фразу
        if (message.message && message.message.toUpperCase().includes('ПОИСК ПО ТЕЛЕГЕ')) {
          console.log(`   🎯 *** НАЙДЕНА ПОИСКОВАЯ ФРАЗА! ***`);
        }
        console.log('');
      }
      
      return messages;
      
    } catch (error) {
      console.error('❌ Ошибка получения сообщений:', error);
      return [];
    }
  }

  async testSendMessage() {
    try {
      const testMessage = `🧪 ТЕСТ ${new Date().toLocaleTimeString('ru-RU')} - проверка отправки`;
      
      await this.client.sendMessage(this.antilopaGroupId, { 
        message: testMessage
      });
      
      console.log(`✅ Отправлено тестовое сообщение: "${testMessage}"`);
      
      // Ждем 2 секунды и проверяем снова
      setTimeout(async () => {
        console.log('\n📬 Проверяю сообщения после отправки...');
        await this.testDirectMessages();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
    }
  }
}

async function testDirect() {
  const test = new DirectAntilopaTest();
  
  try {
    await test.init();
    
    // Сначала смотрим существующие сообщения
    await test.testDirectMessages();
    
    // Потом отправляем тестовое
    console.log('\n📤 Отправляю тестовое сообщение...');
    await test.testSendMessage();
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  }
}

testDirect();
