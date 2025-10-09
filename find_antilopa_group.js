require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

class GroupFinder {
  constructor() {
    this.client = null;
  }

  async init() {
    try {
      console.log('🔍 Подключение к Telegram для поиска групп...');
      
      const mtClient = MTProtoClient.get();
      this.client = mtClient.getClient();
      await this.client.connect();
      
      console.log('✅ Подключение установлено');
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
      throw error;
    }
  }

  async findAllGroups() {
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

      const groups = [];
      const channels = [];
      
      console.log(`✅ Найдено ${dialogs.dialogs.length} диалогов`);
      console.log('');
      
      for (let dialog of dialogs.dialogs) {
        const peer = dialog.peer;
        
        if (peer.className === 'PeerChannel') {
          const channelId = peer.channelId;
          const channel = dialogs.chats.find(chat => chat.id === channelId);
          
          if (channel) {
            const info = {
              id: channel.id.toString(),
              title: channel.title || 'Без названия',
              username: channel.username || null,
              type: channel.broadcast ? 'channel' : 'group',
              participantsCount: channel.participantsCount || 0,
              about: channel.about || null
            };
            
            if (channel.broadcast) {
              channels.push(info);
            } else {
              groups.push(info);
            }
          }
        }
      }

      return { groups, channels };
    } catch (error) {
      console.error('❌ Ошибка получения диалогов:', error);
      return { groups: [], channels: [] };
    }
  }

  async searchForAntilopa() {
    try {
      const { groups, channels } = await this.findAllGroups();
      
      console.log('🔍 ПОИСК ГРУППЫ/КАНАЛА АНТИЛОПА');
      console.log('=' .repeat(50));
      
      // Ищем точные совпадения
      const antilopaGroups = groups.filter(g => 
        g.title.toLowerCase().includes('антилопа') ||
        g.title.toLowerCase().includes('antilopa') ||
        (g.username && g.username.toLowerCase().includes('antilopa'))
      );
      
      const antilopaChannels = channels.filter(c => 
        c.title.toLowerCase().includes('антилопа') ||
        c.title.toLowerCase().includes('antilopa') ||
        (c.username && c.username.toLowerCase().includes('antilopa'))
      );
      
      if (antilopaGroups.length > 0) {
        console.log('🎯 НАЙДЕННЫЕ ГРУППЫ С "АНТИЛОПА":');
        console.log('-' .repeat(40));
        antilopaGroups.forEach((group, index) => {
          console.log(`${index + 1}. 👥 ${group.title}`);
          console.log(`   ID: ${group.id}`);
          console.log(`   Username: ${group.username ? '@' + group.username : 'не указан'}`);
          console.log(`   Участников: ${group.participantsCount.toLocaleString('ru-RU')}`);
          if (group.about) {
            console.log(`   Описание: ${group.about.substring(0, 100)}...`);
          }
          console.log('');
        });
      }
      
      if (antilopaChannels.length > 0) {
        console.log('🎯 НАЙДЕННЫЕ КАНАЛЫ С "АНТИЛОПА":');
        console.log('-' .repeat(40));
        antilopaChannels.forEach((channel, index) => {
          console.log(`${index + 1}. 📺 ${channel.title}`);
          console.log(`   ID: ${channel.id}`);
          console.log(`   Username: ${channel.username ? '@' + channel.username : 'не указан'}`);
          console.log(`   Участников: ${channel.participantsCount.toLocaleString('ru-RU')}`);
          if (channel.about) {
            console.log(`   Описание: ${channel.about.substring(0, 100)}...`);
          }
          console.log('');
        });
      }
      
      if (antilopaGroups.length === 0 && antilopaChannels.length === 0) {
        console.log('❌ Группы или каналы с названием "АНТИЛОПА" не найдены');
        console.log('');
        console.log('💡 Возможные причины:');
        console.log('  • Группа называется по-другому');
        console.log('  • Вы не состоите в такой группе');
        console.log('  • Группа архивирована или скрыта');
        console.log('');
        console.log('🔍 Показываю все ваши группы для поиска:');
        this.showAllGroups(groups.slice(0, 20)); // Показываем первые 20
      }
      
      return { antilopaGroups, antilopaChannels, allGroups: groups, allChannels: channels };
      
    } catch (error) {
      console.error('❌ Ошибка поиска АНТИЛОПА:', error);
      return null;
    }
  }

  showAllGroups(groups) {
    console.log('');
    console.log('👥 ВАШИ ГРУППЫ (первые 20):');
    console.log('=' .repeat(50));
    
    groups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.title}`);
      console.log(`   ID: ${group.id}`);
      if (group.username) {
        console.log(`   Username: @${group.username}`);
      }
      console.log(`   Участников: ${group.participantsCount.toLocaleString('ru-RU')}`);
      console.log('');
    });
  }

  async close() {
    try {
      if (this.client) {
        await this.client.disconnect();
        console.log('🛑 Соединение закрыто');
      }
    } catch (error) {
      console.error('❌ Ошибка закрытия соединения:', error);
    }
  }
}

async function findAntilopaGroup() {
  const finder = new GroupFinder();
  
  try {
    await finder.init();
    const result = await finder.searchForAntilopa();
    
    if (result && (result.antilopaGroups.length > 0 || result.antilopaChannels.length > 0)) {
      console.log('🎉 НАЙДЕНЫ ПОТЕНЦИАЛЬНЫЕ КАНДИДАТЫ!');
      console.log('');
      console.log('📝 Что делать дальше:');
      console.log('1. Скопируйте ID нужной группы');
      console.log('2. Замените в antilopa-search-monitor.js строку поиска');
      console.log('3. Или используйте точное название группы');
      console.log('');
      console.log('💡 Совет: Если группа называется не "АНТИЛОПА",');
      console.log('   можно изменить поиск в коде на точное название.');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await finder.close();
  }
}

if (require.main === module) {
  findAntilopaGroup();
}

module.exports = { GroupFinder };

