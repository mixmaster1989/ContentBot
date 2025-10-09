require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

async function showAllGroups() {
  let client = null;
  
  try {
    console.log('🔍 Подключение к Telegram...');
    
    const mtClient = MTProtoClient.get();
    client = mtClient.getClient();
    await client.connect();
    
    console.log('✅ Подключение установлено');
    console.log('📋 Получаю все ваши группы...');
    
    const dialogs = await client.invoke(
      new Api.messages.GetDialogs({
        offsetDate: 0,
        offsetId: 0,
        offsetPeer: new Api.InputPeerEmpty(),
        limit: 1000,
        hash: 0n
      })
    );

    const groups = [];
    
    for (let dialog of dialogs.dialogs) {
      const peer = dialog.peer;
      
      if (peer.className === 'PeerChannel') {
        const channelId = peer.channelId;
        const channel = dialogs.chats.find(chat => chat.id === channelId);
        
        if (channel && !channel.broadcast) { // Только группы, не каналы
          groups.push({
            id: channel.id.toString(),
            title: channel.title || 'Без названия',
            username: channel.username || null,
            participantsCount: channel.participantsCount || 0,
            about: channel.about || null
          });
        }
      }
    }

    console.log(`\n👥 ВСЕ ВАШИ ГРУППЫ (${groups.length}):`);
    console.log('=' .repeat(60));
    
    if (groups.length === 0) {
      console.log('❌ Групп не найдено');
      return;
    }

    // Сортируем по количеству участников
    groups.sort((a, b) => b.participantsCount - a.participantsCount);
    
    groups.forEach((group, index) => {
      console.log(`${index + 1}. 📱 ${group.title}`);
      console.log(`   🆔 ID: ${group.id}`);
      if (group.username) {
        console.log(`   📎 Username: @${group.username}`);
      }
      console.log(`   👥 Участников: ${group.participantsCount.toLocaleString('ru-RU')}`);
      if (group.about) {
        const desc = group.about.length > 100 ? group.about.substring(0, 100) + '...' : group.about;
        console.log(`   📝 О группе: ${desc}`);
      }
      console.log('');
    });
    
    console.log('💡 Инструкция:');
    console.log('1. Найдите нужную группу в списке выше');
    console.log('2. Скопируйте её ID (например: 123456789)');
    console.log('3. Запустите настройку мониторинга:');
    console.log('   node setup_group_monitor.js');
    console.log('');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    if (client) {
      try {
        await client.disconnect();
        console.log('🛑 Соединение закрыто');
      } catch (e) {
        // ignore
      }
    }
  }
}

showAllGroups();

