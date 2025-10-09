require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

class MilitaristFinder {
  constructor() {
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
  }

  async init() {
    try {
      await this.client.connect();
      console.log('✅ Подключение к Telegram установлено');
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
    }
  }

  // Поиск канала "Милитарист"
  async findMilitaristChannel() {
    try {
      console.log('🎯 Поиск канала "Милитарист"...\n');
      
      const dialogs = await this.client.invoke(
        new Api.messages.GetDialogs({
          offsetDate: 0,
          offsetId: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          limit: 1000,
          hash: 0n
        })
      );

      console.log(`📋 Найдено ${dialogs.dialogs.length} диалогов`);
      console.log(`📊 Найдено ${dialogs.chats.length} чатов/каналов\n`);

      // Ищем канал "Милитарист"
      const militaristChannel = dialogs.chats.find(chat => 
        chat.title && chat.title.toLowerCase().includes('милитарист')
      );

      if (militaristChannel) {
        console.log('🎯 КАНАЛ "МИЛИТАРИСТ" НАЙДЕН!');
        console.log('=' .repeat(50));
        console.log(`📺 Название: ${militaristChannel.title}`);
        console.log(`🆔 ID: ${militaristChannel.id}`);
        console.log(`👤 Username: @${militaristChannel.username || 'не указан'}`);
        console.log(`📊 Тип: ${militaristChannel.className}`);
        console.log(`📡 Broadcast: ${militaristChannel.broadcast}`);
        console.log(`👥 Участников: ${militaristChannel.participantsCount || 'неизвестно'}`);
        console.log(`📝 Описание: ${militaristChannel.about || 'не указано'}`);
        
        // Получаем последние сообщения
        console.log('\n📝 Получаю последние сообщения...');
        await this.getLastMessages(militaristChannel.id);
        
        return militaristChannel;
      } else {
        console.log('❌ Канал "Милитарист" не найден');
        
        // Показываем все каналы для отладки
        console.log('\n📺 Все ваши каналы:');
        console.log('=' .repeat(30));
        dialogs.chats.forEach((chat, index) => {
          if (chat.title) {
            console.log(`${index + 1}. ${chat.title} (ID: ${chat.id})`);
          }
        });
        
        return null;
      }

    } catch (error) {
      console.error('❌ Ошибка поиска канала:', error);
      return null;
    }
  }

  // Получить последние сообщения из канала
  async getLastMessages(channelId) {
    try {
      const messages = await this.client.invoke(
        new Api.messages.GetHistory({
          peer: channelId,
          limit: 5,
          offsetDate: 0,
          offsetId: 0,
          maxId: 0,
          minId: 0,
          addOffset: 0,
          hash: 0n
        })
      );

      console.log(`\n📝 Последние ${messages.messages.length} сообщений:`);
      console.log('=' .repeat(50));

      messages.messages.forEach((msg, index) => {
        if (msg.message) {
          const date = new Date(msg.date * 1000).toLocaleString('ru');
          const text = msg.message.length > 100 ? 
            msg.message.substring(0, 100) + '...' : 
            msg.message;
          
          console.log(`\n${index + 1}. [${date}]`);
          console.log(`   Просмотров: ${msg.views || 0}`);
          console.log(`   Текст: ${text}`);
        }
      });

    } catch (error) {
      console.error('❌ Ошибка получения сообщений:', error);
    }
  }

  async close() {
    if (this.client) {
      await this.client.disconnect();
      console.log('\n🛑 Соединение закрыто');
    }
  }
}

// Основная функция
async function findMilitarist() {
  const finder = new MilitaristFinder();
  
  try {
    await finder.init();
    const channel = await finder.findMilitaristChannel();
    
    if (channel) {
      console.log('\n✅ Поиск завершен успешно!');
      console.log(`🎯 Канал найден: ${channel.title} (ID: ${channel.id})`);
    } else {
      console.log('\n❌ Канал "Милитарист" не найден среди ваших подписок');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await finder.close();
  }
}

// Запуск поиска
if (require.main === module) {
  findMilitarist();
}

module.exports = { MilitaristFinder };

