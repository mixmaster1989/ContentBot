require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

class ChannelFinder {
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

  // Поиск канала по username
  async findChannelByUsername(username) {
    try {
      console.log(`🔍 Ищу канал: ${username}`);
      
      const result = await this.client.invoke(
        new Api.contacts.ResolveUsername({ 
          username: username.replace('@', '') 
        })
      );

      if (result.chats && result.chats.length > 0) {
        const channel = result.chats[0];
        
        console.log('✅ Канал найден!');
        console.log('📊 Информация о канале:');
        console.log(`   ID: ${channel.id}`);
        console.log(`   Username: @${channel.username || 'не указан'}`);
        console.log(`   Title: ${channel.title}`);
        console.log(`   Type: ${channel.className}`);
        console.log(`   Participants: ${channel.participantsCount || 'неизвестно'}`);
        console.log(`   Description: ${channel.about || 'не указано'}`);
        
        return {
          id: channel.id,
          username: channel.username,
          title: channel.title,
          type: channel.className,
          participants: channel.participantsCount,
          description: channel.about
        };
      } else {
        console.log('❌ Канал не найден');
        return null;
      }

    } catch (error) {
      console.error('❌ Ошибка поиска канала:', error);
      return null;
    }
  }

  // Поиск каналов по ключевому слову
  async searchChannelsByKeyword(keyword) {
    try {
      console.log(`🔍 Ищу каналы по ключевому слову: ${keyword}`);
      
      // Попробуем разные варианты поиска
      const searchVariants = [
        'militarist',
        'militarist_ru', 
        'military_news',
        'voennye_novosti',
        'military_channel',
        'army_news',
        'voennye',
        'military_ru',
        'army_ru',
        'defense_news',
        'военные_новости',
        'армия_новости',
        'оборона_новости'
      ];

      for (let variant of searchVariants) {
        console.log(`   Пробую: ${variant}`);
        const result = await this.findChannelByUsername(variant);
        if (result) {
          return result;
        }
      }

      console.log('❌ Каналы не найдены');
      return null;

    } catch (error) {
      console.error('❌ Ошибка поиска:', error);
      return null;
    }
  }

  // Получить последние сообщения из канала
  async getChannelMessages(channelId, limit = 10) {
    try {
      console.log(`📝 Получаю последние сообщения из канала ${channelId}`);
      
      const messages = await this.client.invoke(
        new Api.messages.GetHistory({
          peer: channelId,
          limit: limit,
          offsetDate: 0,
          offsetId: 0,
          maxId: 0,
          minId: 0,
          addOffset: 0,
          hash: 0n
        })
      );

      console.log(`✅ Получено ${messages.messages.length} сообщений`);
      
      const recentMessages = messages.messages
        .filter(msg => msg.message)
        .slice(0, 5)
        .map(msg => ({
          id: msg.id,
          text: msg.message.substring(0, 100) + '...',
          date: new Date(msg.date * 1000).toLocaleString('ru'),
          views: msg.views || 0
        }));

      return recentMessages;

    } catch (error) {
      console.error('❌ Ошибка получения сообщений:', error);
      return [];
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
async function findMilitaristChannel() {
  const finder = new ChannelFinder();
  
  try {
    await finder.init();
    
    // Ищем канал "милитарист"
    console.log('🎯 Поиск канала "милитарист"...\n');
    
    const channel = await finder.searchChannelsByKeyword('милитарист');
    
    if (channel) {
      console.log('\n📋 Детальная информация:');
      console.log(JSON.stringify(channel, null, 2));
      
      // Получаем последние сообщения
      const messages = await finder.getChannelMessages(channel.id);
      if (messages.length > 0) {
        console.log('\n📝 Последние сообщения:');
        messages.forEach((msg, index) => {
          console.log(`${index + 1}. [${msg.date}] ${msg.text} (просмотров: ${msg.views})`);
        });
      }
    } else {
      console.log('\n❌ Канал "милитарист" не найден');
      console.log('💡 Попробуйте другие варианты поиска:');
      console.log('   - @militarist');
      console.log('   - @militarist_ru');
      console.log('   - @military_news');
      console.log('   - @voennye_novosti');
    }
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await finder.close();
  }
}

// Запуск поиска
if (require.main === module) {
  findMilitaristChannel();
}

module.exports = { ChannelFinder };
