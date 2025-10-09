const { Api } = require('telegram');
const { MTProtoClient } = require('../../telegram_parser/dist/mtproto/client');

class ProfitPotokManager {
  constructor() {
    // Меняем рабочую директорию как в проекте
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    
    // Данные канала ПРОФИТПОТОК
    this.channelData = {
      id: 2934934414,
      username: 'profitpotoksignal',
      title: 'ПрофитПоток | Крипто-сигналы 💵'
    };
    
    this.isInitialized = false;
  }

  async init() {
    try {
      console.log('🚀 Инициализация ProfitPotokManager...');
      
      // Подключаем MTProto клиент
      await this.mt.start();
      console.log('✅ Telegram клиент подключен');
      
      // Проверяем доступ к каналу
      await this.verifyChannelAccess();
      
      this.isInitialized = true;
      console.log('✅ ProfitPotokManager готов к работе');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации ProfitPotokManager:', error);
      throw error;
    }
  }

  async verifyChannelAccess() {
    try {
      console.log('🔍 Проверка доступа к каналу ПРОФИТПОТОК...');
      
      // Проверяем по ID
      const channelByID = await this.getChannelByID(this.channelData.id);
      if (channelByID) {
        console.log(`✅ Канал найден по ID: ${channelByID.title}`);
      }
      
      // Проверяем по username
      const channelByUsername = await this.getChannelByUsername(this.channelData.username);
      if (channelByUsername) {
        console.log(`✅ Канал найден по username: @${channelByUsername.username}`);
      }
      
      if (!channelByID && !channelByUsername) {
        throw new Error('❌ Канал ПРОФИТПОТОК не найден или нет доступа');
      }
      
    } catch (error) {
      console.error('❌ Ошибка проверки доступа:', error);
      throw error;
    }
  }

  async getChannelByID(channelId) {
    try {
      const channel = await this.client.invoke(
        new Api.channels.GetChannels({
          id: [new Api.InputChannel({
            channelId: channelId,
            accessHash: 0n // Будет получен автоматически
          })]
        })
      );
      
      if (channel.chats && channel.chats.length > 0) {
        return channel.chats[0];
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Ошибка получения канала по ID ${channelId}:`, error.message);
      return null;
    }
  }

  async getChannelByUsername(username) {
    try {
      const resolved = await this.client.invoke(
        new Api.contacts.ResolveUsername({
          username: username.replace('@', '')
        })
      );
      
      if (resolved.chats && resolved.chats.length > 0) {
        return resolved.chats[0];
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Ошибка получения канала по username @${username}:`, error.message);
      return null;
    }
  }

  async sendTestPost() {
    try {
      if (!this.isInitialized) {
        throw new Error('Manager не инициализирован');
      }

      console.log('📝 Отправка тестового поста в канал ПРОФИТПОТОК...');
      
      const testMessage = `🧪 ТЕСТОВЫЙ ПОСТ
📅 Время: ${new Date().toLocaleString('ru-RU')}
🤖 Отправлено через ProfitPotokManager
⏰ Будет удален через 10 секунд`;

      // Получаем канал
      const channel = await this.getChannelByID(this.channelData.id);
      if (!channel) {
        throw new Error('Канал не найден');
      }

      // Отправляем сообщение
      const sentMessage = await this.client.invoke(
        new Api.messages.SendMessage({
          peer: new Api.InputPeerChannel({
            channelId: channel.id,
            accessHash: channel.accessHash
          }),
          message: testMessage,
          randomId: BigInt(Math.floor(Math.random() * 1000000000))
        })
      );

      console.log('✅ Тестовый пост отправлен');
      console.log(`📊 ID сообщения: ${sentMessage.id}`);
      
      return {
        messageId: sentMessage.id,
        channelId: channel.id,
        accessHash: channel.accessHash
      };

    } catch (error) {
      console.error('❌ Ошибка отправки поста:', error);
      throw error;
    }
  }

  async deleteMessage(messageId, channelId, accessHash) {
    try {
      console.log(`🗑️ Удаление сообщения ${messageId}...`);
      
      await this.client.invoke(
        new Api.channels.DeleteMessages({
          channel: new Api.InputChannel({
            channelId: channelId,
            accessHash: accessHash
          }),
          id: [messageId]
        })
      );

      console.log('✅ Сообщение удалено');
      
    } catch (error) {
      console.error('❌ Ошибка удаления сообщения:', error);
      throw error;
    }
  }

  async testPostAndDelete() {
    try {
      console.log('🧪 Запуск теста: отправка и удаление поста');
      console.log('==========================================');
      
      // Отправляем тестовый пост
      const postData = await this.sendTestPost();
      
      // Ждем 10 секунд
      console.log('⏰ Ожидание 10 секунд...');
      await this.delay(10000);
      
      // Удаляем пост
      await this.deleteMessage(postData.messageId, postData.channelId, postData.accessHash);
      
      console.log('✅ Тест завершен успешно!');
      
    } catch (error) {
      console.error('❌ Ошибка теста:', error);
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    try {
      await this.client.disconnect();
      console.log('✅ Соединение закрыто');
    } catch (error) {
      console.error('❌ Ошибка закрытия соединения:', error);
    }
  }
}

module.exports = { ProfitPotokManager };

  /**
   * Просмотр папки КРИПТА
   */
  async viewCryptoFolder() {
    try {
      console.log('🔍 Поиск папки КРИПТА...');
      
      // Получаем все фильтры диалогов
      const dialogFilters = await this.client.invoke(
        new Api.messages.GetDialogFilters()
      );
      
      // Ищем папку КРИПТА
      const cryptoFilter = dialogFilters.filters.find(filter => 
        filter.title === 'КРИПТА' || 
        filter.title === 'КРИПТО' ||
        filter.title === 'CRYPTO' ||
        filter.title === 'Crypto'
      );
      
      if (!cryptoFilter) {
        console.log('❌ Папка КРИПТА не найдена в фильтрах');
        console.log('📋 Доступные папки:');
        dialogFilters.filters.forEach((filter, index) => {
          console.log(`   ${index + 1}. ${filter.title} (ID: ${filter.id})`);
        });
        return null;
      }
      
      console.log(`✅ Папка КРИПТА найдена: "${cryptoFilter.title}" (ID: ${cryptoFilter.id})`);
      console.log(`📊 Каналов в папке: ${cryptoFilter.includePeers?.length || 0}`);
      
      if (!cryptoFilter.includePeers || cryptoFilter.includePeers.length === 0) {
        console.log('⚠️ Папка КРИПТА пуста');
        return { filter: cryptoFilter, channels: [] };
      }
      
      // Получаем информацию о каналах
      const channels = [];
      console.log('\n📺 Каналы в папке КРИПТА:');
      console.log('='.repeat(50));
      
      for (let i = 0; i < cryptoFilter.includePeers.length; i++) {
        const peer = cryptoFilter.includePeers[i];
        
        try {
          let channelEntity = null;
          let channelInfo = null;
          
          if (peer.className === 'InputPeerChannel') {
            // Канал
            const inputPeer = new Api.InputPeerChannel({
              channelId: peer.channelId,
              accessHash: peer.accessHash
            });
            
            channelEntity = await this.client.getEntity(inputPeer);
            channelInfo = {
              type: 'Канал',
              id: channelEntity.id,
              title: channelEntity.title,
              username: channelEntity.username ? `@${channelEntity.username}` : 'Нет username',
              participantsCount: channelEntity.participantsCount || 'Не указано',
              isChannel: true
            };
            
          } else if (peer.className === 'InputPeerChat') {
            // Группа
            const inputPeer = new Api.InputPeerChat({
              chatId: peer.chatId
            });
            
            channelEntity = await this.client.getEntity(inputPeer);
            channelInfo = {
              type: 'Группа',
              id: channelEntity.id,
              title: channelEntity.title,
              username: channelEntity.username ? `@${channelEntity.username}` : 'Нет username',
              participantsCount: channelEntity.participantsCount || 'Не указано',
              isChannel: false
            };
          }
          
          if (channelInfo) {
            channels.push(channelInfo);
            console.log(`${i + 1}. ${channelInfo.type}: ${channelInfo.title}`);
            console.log(`   ID: ${channelInfo.id}`);
            console.log(`   Username: ${channelInfo.username}`);
            console.log(`   Участники: ${channelInfo.participantsCount}`);
            console.log(`   Ссылка: https://t.me/${channelInfo.username.replace('@', '') || 'channel'}`);
            console.log('');
          }
          
        } catch (error) {
          console.log(`${i + 1}. ❌ Ошибка получения канала: ${error.message}`);
        }
      }
      
      console.log(`📊 Итого каналов в папке КРИПТА: ${channels.length}`);
      
      return {
        filter: cryptoFilter,
        channels: channels
      };
      
    } catch (error) {
      console.error('❌ Ошибка просмотра папки КРИПТА:', error);
      throw error;
    }
  }

  /**
   * Тест просмотра папки КРИПТА
   */
  async testCryptoFolderView() {
    try {
      console.log('🧪 ТЕСТ ПРОСМОТРА ПАПКИ КРИПТА');
      console.log('===============================');
      
      const result = await this.viewCryptoFolder();
      
      if (result) {
        console.log('\n✅ Тест просмотра папки КРИПТА завершен успешно!');
        console.log(`📊 Найдено каналов: ${result.channels.length}`);
        
        if (result.channels.length > 0) {
          console.log('\n🎯 Первые 5 каналов:');
          result.channels.slice(0, 5).forEach((channel, index) => {
            console.log(`${index + 1}. ${channel.title} (${channel.type})`);
          });
        }
      } else {
        console.log('❌ Тест не прошел - папка КРИПТА не найдена');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Ошибка теста просмотра папки КРИПТА:', error);
      throw error;
    }
  }


  /**
   * Прогрев каналов папки КРИПТА для получения апдейтов
   * (как в оригинальном realtime_parser)
   */
  async warmupCryptoChannels() {
    try {
      console.log('🔥 Прогрев каналов папки КРИПТА для получения апдейтов...');
      
      // Сначала получаем папку КРИПТА
      const cryptoFolder = await this.viewCryptoFolder();
      if (!cryptoFolder || cryptoFolder.channels.length === 0) {
        console.log('❌ Нет каналов в папке КРИПТА для прогрева');
        return false;
      }
      
      console.log(`📊 Найдено ${cryptoFolder.channels.length} каналов для прогрева`);
      
      // Прогреваем каждый канал
      let successCount = 0;
      for (let i = 0; i < cryptoFolder.channels.length; i++) {
        const channel = cryptoFolder.channels[i];
        
        try {
          // Прогреваем канал через getEntity (как в оригинале)
          await this.client.getEntity(channel.id);
          console.log(`✅ Прогрет канал: ${channel.title}`);
          successCount++;
          
          // Небольшая задержка между запросами
          await this.delay(100);
          
        } catch (error) {
          console.log(`⚠️ Не удалось прогреть канал ${channel.title}: ${error.message}`);
        }
      }
      
      console.log(`✅ Прогрев завершен: ${successCount}/${cryptoFolder.channels.length} каналов прогрето`);
      
      return successCount > 0;
      
    } catch (error) {
      console.error('❌ Ошибка прогрева каналов:', error);
      return false;
    }
  }

  /**
   * Тест прогрева каналов папки КРИПТА
   */
  async testWarmupCryptoChannels() {
    try {
      console.log('🧪 ТЕСТ ПРОГРЕВА КАНАЛОВ ПАПКИ КРИПТА');
      console.log('=====================================');
      
      const success = await this.warmupCryptoChannels();
      
      if (success) {
        console.log('\n✅ Тест прогрева завершен успешно!');
        console.log('🔥 Каналы папки КРИПТА готовы к получению апдейтов');
      } else {
        console.log('\n❌ Тест прогрева не прошел');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Ошибка теста прогрева:', error);
      throw error;
    }
  }


  /**
   * Cloud.ru LLM интеграция
   */
  constructor() {
    // Меняем рабочую директорию как в проекте
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    
    // Данные канала ПРОФИТПОТОК
    this.channelData = {
      id: 2934934414,
      username: 'profitpotoksignal',
      title: 'ПрофитПоток | Крипто-сигналы 💵'
    };
    
    // Cloud.ru LLM конфигурация
    this.cloudRuConfig = {
      apiKey: process.env.LLM_API,
      baseUrl: 'https://foundation-models.api.cloud.ru/v1',
      model: 'openai/gpt-oss-120b',
      maxTokens: 200000,
      temperature: 0.6
    };
    
    this.isInitialized = false;
  }

  /**
   * Запрос к Cloud.ru LLM API
   */
  async cloudRuRequest(messages) {
    try {
      const axios = require('axios');
      
      const response = await axios.post(
        `${this.cloudRuConfig.baseUrl}/chat/completions`,
        {
          model: this.cloudRuConfig.model,
          messages: messages,
          max_tokens: 1000,
          temperature: this.cloudRuConfig.temperature,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.cloudRuConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('❌ Cloud.ru LLM ошибка:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Тест Cloud.ru LLM подключения
   */
  async testCloudRuLLM() {
    try {
      console.log('🧪 ТЕСТ CLOUD.RU LLM ПОДКЛЮЧЕНИЯ');
      console.log('==================================');
      
      // Проверяем конфигурацию
      console.log(`🔑 API ключ: ${this.cloudRuConfig.apiKey ? '✅ Настроен' : '❌ Не настроен'}`);
      console.log(`🌐 URL: ${this.cloudRuConfig.baseUrl}`);
      console.log(`🤖 Модель: ${this.cloudRuConfig.model}`);
      
      if (!this.cloudRuConfig.apiKey) {
        console.log('❌ LLM_API ключ не настроен в .env');
        return false;
      }
      
      // Простой тест подключения
      const testMessages = [
        {
          role: "system",
          content: "Ты полезный AI ассистент."
        },
        {
          role: "user", 
          content: "Скажи просто 'Cloud.ru LLM работает!' на русском языке."
        }
      ];
      
      console.log('🔗 Тестирую подключение к Cloud.ru...');
      const response = await this.cloudRuRequest(testMessages);
      
      if (response) {
        console.log(`✅ Cloud.ru LLM работает! Ответ: "${response}"`);
        return true;
      } else {
        console.log('❌ Cloud.ru LLM не отвечает');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Ошибка теста Cloud.ru LLM:', error);
      return false;
    }
  }

