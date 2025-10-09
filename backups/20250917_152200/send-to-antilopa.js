require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');
const fs = require('fs').promises;

class AntilopaSender {
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

  // Найти группу "Антилопа"
  async findAntilopaGroup() {
    try {
      console.log('🔍 Ищу группу "Антилопа"...');
      
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

      // Ищем группу "Антилопа"
      const antilopaGroup = dialogs.chats.find(chat => 
        chat.title && chat.title.toLowerCase().includes('антилопа')
      );

      if (antilopaGroup) {
        console.log('🎯 ГРУППА "АНТИЛОПА" НАЙДЕНА!');
        console.log(`📺 Название: ${antilopaGroup.title}`);
        console.log(`🆔 ID: ${antilopaGroup.id}`);
        console.log(`👥 Участников: ${antilopaGroup.participantsCount || 'неизвестно'}`);
        console.log(`📊 Тип: ${antilopaGroup.className}`);
        
        return antilopaGroup;
      } else {
        console.log('❌ Группа "Антилопа" не найдена');
        
        // Показываем все группы для отладки
        console.log('\n📺 Все группы и каналы:');
        console.log('=' .repeat(30));
        dialogs.chats.forEach((chat, index) => {
          if (chat.title) {
            console.log(`${index + 1}. ${chat.title} (ID: ${chat.id})`);
          }
        });
        
        return null;
      }

    } catch (error) {
      console.error('❌ Ошибка поиска группы:', error);
      return null;
    }
  }

  // Отправить сводку в группу
  async sendSummaryToGroup(groupId, summaryText) {
    try {
      console.log(`📤 Отправляю сводку в группу ${groupId}...`);
      
      // Формируем сообщение
      const message = `🎯 СВОДКА КАНАЛА "МИЛИТАРИСТ"\n\n${summaryText}\n\n🤖 Создано автоматически через ContentBot`;
      
      // Отправляем сообщение
      const result = await this.client.invoke(
        new Api.messages.SendMessage({
          peer: groupId,
          message: message,
          parseMode: 'markdown'
        })
      );

      console.log('✅ Сводка успешно отправлена в группу!');
      return result;

    } catch (error) {
      console.error('❌ Ошибка отправки сообщения:', error);
      return null;
    }
  }

  // Отправить файл со сводкой
  async sendFileToGroup(groupId, filePath) {
    try {
      console.log(`📁 Отправляю файл ${filePath} в группу...`);
      
      // Читаем файл
      const fileContent = await fs.readFile(filePath, 'utf8');
      
      // Создаем временный файл для отправки
      const tempFileName = `militarist_summary_${Date.now()}.txt`;
      await fs.writeFile(tempFileName, fileContent, 'utf8');
      
      // Отправляем как документ
      const result = await this.client.invoke(
        new Api.messages.SendMedia({
          peer: groupId,
          media: new Api.InputMediaUploadedDocument({
            file: await this.client.uploadFile({
              file: tempFileName,
              workers: 1
            }),
            mimeType: 'text/plain',
            attributes: [
              new Api.DocumentAttributeFilename({
                fileName: tempFileName
              })
            ]
          }),
          message: '📊 Детальная сводка канала "Милитарист"',
          parseMode: 'markdown'
        })
      );

      // Удаляем временный файл
      await fs.unlink(tempFileName);
      
      console.log('✅ Файл успешно отправлен в группу!');
      return result;

    } catch (error) {
      console.error('❌ Ошибка отправки файла:', error);
      return null;
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
async function sendToAntilopa() {
  const sender = new AntilopaSender();
  
  try {
    await sender.init();
    
    console.log('🎯 Отправка сводки в группу "Антилопа"');
    console.log('');
    
    // Находим группу
    const group = await sender.findAntilopaGroup();
    
    if (!group) {
      console.log('❌ Группа "Антилопа" не найдена');
      return;
    }
    
    // Читаем последнюю сводку
    const summaryFiles = await fs.readdir('.');
    const latestSummary = summaryFiles
      .filter(f => f.startsWith('militarist_detailed_summary_'))
      .sort()
      .pop();
    
    if (!latestSummary) {
      console.log('❌ Файл сводки не найден');
      return;
    }
    
    console.log(`📄 Использую файл: ${latestSummary}`);
    
    // Читаем содержимое сводки
    const summaryContent = await fs.readFile(latestSummary, 'utf8');
    
    // Отправляем полную сводку как сообщение
    await sender.sendSummaryToGroup(group.id, summaryContent);
    
    console.log('\n✅ Сводка успешно отправлена в группу "Антилопа"!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await sender.close();
  }
}

// Запуск отправки
if (require.main === module) {
  sendToAntilopa();
}

module.exports = { AntilopaSender };
