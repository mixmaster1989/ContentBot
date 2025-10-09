const { TelegramClient, Api } = require('telegram');
const { StringSession } = require('telegram/sessions');
const path = require('path');

class AntilopaFinder {
  constructor() {
    this.client = null;
  }

  async init() {
    try {
      console.log('🔍 Подключение к Telegram...');
      
      // Используем существующую сессию
      const sessionPath = path.join(__dirname, '../telegram_parser/.session.txt');
      const session = new StringSession(require('fs').readFileSync(sessionPath, 'utf8'));
      
      this.client = new TelegramClient(session, 
        parseInt(process.env.API_ID || process.env.TG_API_ID), 
        process.env.API_HASH || process.env.TG_API_HASH, 
        {
          connectionRetries: 5,
        }
      );

      await this.client.connect();
      console.log('✅ Подключение установлено');
      
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
      throw error;
    }
  }

  async findAllChats() {
    try {
      console.log('📋 Получаю ВСЕ ваши чаты...');
      
      // Получаем все диалоги
      const dialogs = await this.client.invoke(
        new Api.messages.GetDialogs({
          offsetDate: 0,
          offsetId: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          limit: 1000,
          hash: 0n
        })
      );

      const allChats = [];
      const antilopaChats = [];
      
      for (let dialog of dialogs.dialogs) {
        const peer = dialog.peer;
        let chatInfo = null;
        
        if (peer.className === 'PeerChat') {
          // Обычная группа
          const chat = dialogs.chats.find(c => c.id === peer.chatId);
          if (chat) {
            chatInfo = {
              id: peer.chatId,
              fullId: `-${peer.chatId}`,
              title: chat.title,
              type: 'Группа',
              participantsCount: chat.participantsCount,
              className: chat.className,
              peerType: 'PeerChat'
            };
          }
        } else if (peer.className === 'PeerChannel') {
          // Канал или супергруппа
          const channel = dialogs.chats.find(c => c.id === peer.channelId);
          if (channel) {
            const fullId = `-100${peer.channelId}`;
            chatInfo = {
              id: peer.channelId,
              fullId: fullId,
              title: channel.title,
              type: channel.megagroup ? 'Супергруппа' : 'Канал',
              participantsCount: channel.participantsCount,
              className: channel.className,
              username: channel.username,
              megagroup: channel.megagroup,
              peerType: 'PeerChannel'
            };
          }
        }
        
        if (chatInfo) {
          allChats.push(chatInfo);
          
          // Проверяем на АНТИЛОПА
          if (chatInfo.title.toLowerCase().includes('антилопа') || 
              chatInfo.title.toLowerCase().includes('antilopa')) {
            antilopaChats.push(chatInfo);
          }
        }
      }

      console.log(`\n🎯 НАЙДЕНО ГРУПП/КАНАЛОВ С "АНТИЛОПА": ${antilopaChats.length}`);
      console.log('='.repeat(80));
      
      if (antilopaChats.length > 0) {
        antilopaChats.forEach((chat, index) => {
          console.log(`${index + 1}. 📺 ${chat.title}`);
          console.log(`   🆔 ID: ${chat.id}`);
          console.log(`   🔢 Full ID: ${chat.fullId}`);
          console.log(`   📊 Тип: ${chat.type}`);
          console.log(`   🏗️ Peer: ${chat.peerType}`);
          if (chat.username) console.log(`   👤 Username: @${chat.username}`);
          if (chat.participantsCount) console.log(`   👥 Участников: ${chat.participantsCount}`);
          console.log(`   🎯 *** ВОЗМОЖНАЯ ГРУППА АНТИЛОПА! ***`);
          console.log('');
        });
        
        console.log('🔧 КАКОЙ ID ИСПОЛЬЗОВАТЬ В КОДЕ:');
        antilopaChats.forEach((chat, index) => {
          console.log(`${index + 1}. Для "${chat.title}": ${chat.fullId}`);
        });
        
      } else {
        console.log('❌ Группы/каналы с названием "АНТИЛОПА" не найдены');
        console.log('\n📋 Показываю все группы и каналы:');
        console.log('='.repeat(80));
        
        const groupsAndChannels = allChats.filter(c => c.type !== 'Пользователь');
        groupsAndChannels.forEach((chat, index) => {
          console.log(`${index + 1}. 📺 ${chat.title}`);
          console.log(`   🔢 Full ID: ${chat.fullId}`);
          console.log(`   📊 Тип: ${chat.type}`);
          console.log('');
        });
      }
      
      return { allChats, antilopaChats };
      
    } catch (error) {
      console.error('❌ Ошибка поиска чатов:', error);
      return { allChats: [], antilopaChats: [] };
    }
  }

  async close() {
    if (this.client) {
      await this.client.disconnect();
      console.log('🛑 Соединение закрыто');
    }
  }
}

async function findRealAntilopa() {
  const finder = new AntilopaFinder();
  
  try {
    await finder.init();
    const result = await finder.findAllChats();
    
    if (result.antilopaChats.length > 0) {
      console.log('\n✅ ГРУППА АНТИЛОПА НАЙДЕНА!');
      console.log('📝 Скопируйте правильный ID и используйте его в коде');
    } else {
      console.log('\n❌ Группа АНТИЛОПА не найдена');
      console.log('💡 Возможно она называется по-другому?');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await finder.close();
  }
}

if (require.main === module) {
  require('dotenv').config();
  findRealAntilopa();
}

module.exports = { AntilopaFinder };
