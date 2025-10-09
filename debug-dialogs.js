require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

class DialogDebugger {
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

  // Отладка всех диалогов
  async debugAllDialogs() {
    try {
      console.log('📋 Получаю список всех диалогов...');
      
      const dialogs = await this.client.invoke(
        new Api.messages.GetDialogs({
          offsetDate: 0,
          offsetId: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          limit: 1000,
          hash: 0n
        })
      );

      console.log(`✅ Найдено ${dialogs.dialogs.length} диалогов`);
      console.log(`📊 Найдено ${dialogs.chats.length} чатов/каналов`);
      console.log(`👥 Найдено ${dialogs.users.length} пользователей`);
      
      console.log('\n🔍 Анализ диалогов:');
      console.log('=' .repeat(60));

      let channelCount = 0;
      let groupCount = 0;
      let userCount = 0;

      for (let i = 0; i < Math.min(dialogs.dialogs.length, 20); i++) {
        const dialog = dialogs.dialogs[i];
        const peer = dialog.peer;
        
        console.log(`\n${i + 1}. Диалог:`);
        console.log(`   Peer тип: ${peer.className}`);
        console.log(`   Dialog данные:`, JSON.stringify(dialog, null, 2));
        
        if (peer.className === 'PeerChannel') {
          const channelId = peer.channelId;
          console.log(`   Ищу канал с ID: ${channelId}`);
          
          const channel = dialogs.chats.find(chat => chat.id === channelId);
          
          if (channel) {
            channelCount++;
            console.log(`   📺 Канал: ${channel.title}`);
            console.log(`   Username: @${channel.username || 'не указан'}`);
            console.log(`   Тип: ${channel.className}`);
            console.log(`   Broadcast: ${channel.broadcast}`);
            console.log(`   Участников: ${channel.participantsCount || 'неизвестно'}`);
            
            // Проверяем на военную тематику
            const title = channel.title.toLowerCase();
            if (title.includes('милитарист') || title.includes('воен') || 
                title.includes('армия') || title.includes('military') ||
                title.includes('defense') || title.includes('army')) {
              console.log(`   🎯 ВОЕННАЯ ТЕМАТИКА НАЙДЕНА!`);
            }
          } else {
            console.log(`   ❌ Канал не найден в списке чатов`);
            console.log(`   Доступные чаты:`, dialogs.chats.map(c => ({id: c.id, title: c.title})).slice(0, 5));
          }
        } else if (peer.className === 'PeerChat') {
          groupCount++;
          const chat = dialogs.chats.find(c => c.id === peer.chatId);
          if (chat) {
            console.log(`   👥 Группа: ${chat.title}`);
            console.log(`   Тип: ${chat.className}`);
          }
        } else if (peer.className === 'PeerUser') {
          userCount++;
          const user = dialogs.users.find(u => u.id === peer.userId);
          if (user) {
            console.log(`   👤 Пользователь: ${user.firstName} ${user.lastName || ''}`);
            console.log(`   Username: @${user.username || 'не указан'}`);
          }
        }
      }

      console.log(`\n📊 Статистика:`);
      console.log(`   Каналов: ${channelCount}`);
      console.log(`   Групп: ${groupCount}`);
      console.log(`   Пользователей: ${userCount}`);

      // Поиск конкретно каналов с военной тематикой
      console.log(`\n🎯 Поиск каналов с военной тематикой:`);
      console.log('=' .repeat(60));

      for (let dialog of dialogs.dialogs) {
        const peer = dialog.peer;
        
        if (peer.className === 'PeerChannel') {
          const channelId = peer.channelId;
          const channel = dialogs.chats.find(chat => chat.id === channelId);
          
          if (channel) {
            const title = channel.title.toLowerCase();
            const username = (channel.username || '').toLowerCase();
            
            if (title.includes('милитарист') || title.includes('воен') || 
                title.includes('армия') || title.includes('military') ||
                title.includes('defense') || title.includes('army') ||
                username.includes('militarist') || username.includes('military') ||
                username.includes('army') || username.includes('defense')) {
              
              console.log(`\n🎯 НАЙДЕН ВОЕННЫЙ КАНАЛ:`);
              console.log(`   Название: ${channel.title}`);
              console.log(`   Username: @${channel.username || 'не указан'}`);
              console.log(`   ID: ${channel.id}`);
              console.log(`   Тип: ${channel.className}`);
              console.log(`   Broadcast: ${channel.broadcast}`);
              console.log(`   Участников: ${channel.participantsCount || 'неизвестно'}`);
              console.log(`   Описание: ${channel.about || 'не указано'}`);
            }
          }
        }
      }

    } catch (error) {
      console.error('❌ Ошибка отладки диалогов:', error);
    }
  }

  async close() {
    if (this.client) {
      await this.client.disconnect();
      console.log('🛑 Соединение закрыто');
    }
  }
}

// Основная функция
async function debugDialogs() {
  const dialogDebugger = new DialogDebugger();
  
  try {
    await dialogDebugger.init();
    await dialogDebugger.debugAllDialogs();
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await dialogDebugger.close();
  }
}

// Запуск отладки
if (require.main === module) {
  debugDialogs();
}

module.exports = { DialogDebugger };
