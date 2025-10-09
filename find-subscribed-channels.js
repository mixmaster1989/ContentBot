require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

class SubscribedChannelFinder {
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

  // Получить все диалоги пользователя
  async getAllDialogs() {
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
      return dialogs;

    } catch (error) {
      console.error('❌ Ошибка получения диалогов:', error);
      return null;
    }
  }

  // Поиск каналов по ключевому слову в названии
  async findChannelsByKeyword(keyword) {
    try {
      const dialogs = await this.getAllDialogs();
      if (!dialogs) return [];

      const foundChannels = [];
      const keywordLower = keyword.toLowerCase();

      console.log(`🔍 Ищу каналы содержащие "${keyword}" в названии...`);

      for (let dialog of dialogs.dialogs) {
        const peer = dialog.peer;
        
        // Проверяем каналы и группы
        if (peer.className === 'PeerChannel') {
          const channelId = peer.channelId;
          
          // Находим информацию о канале
          const channel = dialogs.chats.find(chat => 
            chat.id === channelId
          );

          if (channel) {
            const title = channel.title || '';
            const username = channel.username || '';
            
            // Проверяем совпадение в названии или username
            if (title.toLowerCase().includes(keywordLower) || 
                username.toLowerCase().includes(keywordLower)) {
              
              foundChannels.push({
                id: channel.id,
                title: channel.title,
                username: channel.username,
                type: channel.className,
                participants: channel.participantsCount,
                description: channel.about,
                isChannel: channel.broadcast,
                isGroup: !channel.broadcast
              });

              console.log(`✅ Найден канал: ${title} (@${username || 'без username'})`);
            }
          }
        }
      }

      return foundChannels;

    } catch (error) {
      console.error('❌ Ошибка поиска каналов:', error);
      return [];
    }
  }

  // Показать все каналы пользователя
  async showAllChannels() {
    try {
      const dialogs = await this.getAllDialogs();
      if (!dialogs) return;

      console.log('\n📺 Все ваши каналы и группы:');
      console.log('=' .repeat(50));

      const channels = [];
      
      for (let dialog of dialogs.dialogs) {
        const peer = dialog.peer;
        
        if (peer.className === 'PeerChannel') {
          const channelId = peer.channelId;
          const channel = dialogs.chats.find(chat => 
            chat.id === channelId
          );

          if (channel) {
            channels.push({
              id: channel.id,
              title: channel.title,
              username: channel.username,
              type: channel.className,
              participants: channel.participantsCount,
              isChannel: channel.broadcast,
              isGroup: !channel.broadcast
            });
          }
        }
      }

      // Сортируем по названию
      channels.sort((a, b) => a.title.localeCompare(b.title));

      channels.forEach((channel, index) => {
        const type = channel.isChannel ? '📺 Канал' : '👥 Группа';
        const username = channel.username ? `@${channel.username}` : 'без username';
        const participants = channel.participants ? `(${channel.participants} участников)` : '';
        
        console.log(`${index + 1}. ${type}: ${channel.title}`);
        console.log(`   Username: ${username} ${participants}`);
        console.log(`   ID: ${channel.id}`);
        console.log('');
      });

      console.log(`Всего найдено: ${channels.length} каналов/групп`);

    } catch (error) {
      console.error('❌ Ошибка показа каналов:', error);
    }
  }

  async close() {
    if (this.client) {
      await this.client.disconnect();
      console.log('🛑 Соединение закрыто');
    }
  }
}

// Основная функция поиска
async function findMilitaristInSubscriptions() {
  const finder = new SubscribedChannelFinder();
  
  try {
    await finder.init();
    
    console.log('🎯 Поиск канала "милитарист" среди ваших подписок...\n');
    
    // Сначала покажем все каналы
    await finder.showAllChannels();
    
    // Теперь ищем по разным ключевым словам
    const keywords = ['милитарист', 'военные', 'армия', 'military', 'defense', 'воен', 'army'];
    
    for (let keyword of keywords) {
      console.log(`\n🔍 Поиск по ключевому слову: "${keyword}"`);
      const foundChannels = await finder.findChannelsByKeyword(keyword);
      
      if (foundChannels.length > 0) {
        console.log(`\n🎯 Найденные каналы с "${keyword}":`);
        console.log('=' .repeat(50));
        
        foundChannels.forEach((channel, index) => {
          console.log(`${index + 1}. ${channel.title}`);
          console.log(`   Username: @${channel.username || 'не указан'}`);
          console.log(`   ID: ${channel.id}`);
          console.log(`   Тип: ${channel.type}`);
          console.log(`   Участников: ${channel.participants || 'неизвестно'}`);
          console.log(`   Описание: ${channel.description || 'не указано'}`);
          console.log('');
        });
        break; // Прерываем поиск после первого найденного
      }
    }
    
    // Если ничего не найдено
    console.log('\n❌ Каналы с военной тематикой не найдены');
    console.log('💡 Возможно, канал имеет другое название или находится в архиве');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await finder.close();
  }
}

// Запуск поиска
if (require.main === module) {
  findMilitaristInSubscriptions();
}

module.exports = { SubscribedChannelFinder };
