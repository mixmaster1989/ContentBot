require('dotenv').config();
const RealGlobalSearch = require('./core/real-global-search');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

class AntilopaSearchMonitor {
  constructor() {
    this.searchEngine = new RealGlobalSearch();
    this.client = null;
    this.antilopaGroupId = null;
    this.isRunning = false;
    this.triggerPhrase = 'ПОИСК ПО ТЕЛЕГЕ';
    
    console.log('🔍 AntilopaSearchMonitor инициализирован');
  }

  async init() {
    try {
      console.log('🚀 Инициализация мониторинга группы АНТИЛОПА...');
      
      // Меняем рабочую директорию как в goodnight-message.js
      process.chdir('/home/user1/telegram_parser');
      
      // Подключаем MTProto клиент точно как в goodnight-message.js
      const mt = MTProtoClient.get();
      this.client = mt.getClient();
      await mt.start();
      console.log('✅ Telegram клиент подключен');
      
      // Инициализируем поисковый движок с правильным клиентом
      await this.searchEngine.init(this.client);
      
      // Находим группу АНТИЛОПА
      await this.findAntilopaGroup();
      
      console.log('✅ Мониторинг готов к работе!');
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async findAntilopaGroup() {
    try {
      console.log('🔍 Подключение к группе АНТИЛОПА...');
      
      // Используем известный ID группы АНТИЛОПА
      this.antilopaGroupId = -1002686615681;
      
      // Проверяем что группа доступна
      try {
        const channel = await this.client.invoke(
          new Api.channels.GetChannels({
            id: [new Api.InputChannel({
              channelId: Math.abs(this.antilopaGroupId),
              accessHash: 0n
            })]
          })
        );
        
        if (channel.chats && channel.chats[0]) {
          const groupInfo = channel.chats[0];
          console.log(`✅ Подключен к группе АНТИЛОПА: ${groupInfo.title} (ID: ${this.antilopaGroupId})`);
          console.log(`👥 Участников: ${groupInfo.participantsCount || 'неизвестно'}`);
        } else {
          throw new Error('Группа недоступна');
        }
        
      } catch (error) {
        console.log('⚠️ Не удалось получить информацию о группе, но ID известен');
        console.log(`✅ Используем ID группы АНТИЛОПА: ${this.antilopaGroupId}`);
      }
      
    } catch (error) {
      console.error('❌ Ошибка подключения к группе АНТИЛОПА:', error);
      throw error;
    }
  }

  async startMonitoring() {
    if (this.isRunning) {
      console.log('⚠️ Мониторинг уже запущен');
      return;
    }

    this.isRunning = true;
    console.log('👁️ Начинаю мониторинг группы АНТИЛОПА...');
    
    try {
      // НАХУЙ СОБЫТИЯ! ДЕЛАЕМ ПРЯМОЙ POLLING!
      this.lastMessageId = 0;
      
      // Получаем стартовый ID последнего сообщения
      const messages = await this.client.getMessages(this.antilopaGroupId, { limit: 1 });
      if (messages.length > 0) {
        this.lastMessageId = messages[0].id;
        console.log(`🔄 Стартовый ID последнего сообщения: ${this.lastMessageId}`);
      }
      
      // Polling каждые 5 секунд
      this.pollingInterval = setInterval(async () => {
        await this.checkNewMessages();
      }, 5000);
      
      console.log('✅ Мониторинг активен (polling каждые 5 сек)');
      console.log(`🎯 Триггерная фраза: "${this.triggerPhrase}"`);
      
    } catch (error) {
      console.error('❌ Ошибка запуска мониторинга:', error);
      this.isRunning = false;
    }
  }

  async checkNewMessages() {
    try {
      console.log('🔍 Проверяю новые сообщения...');
      
      // Получаем последние сообщения
      const messages = await this.client.getMessages(this.antilopaGroupId, { limit: 10 });
      
      console.log(`📬 Найдено ${messages.length} сообщений, последний ID: ${this.lastMessageId}`);
      
      // Проверяем новые сообщения (с ID больше чем последний)
      for (const message of messages) {
        if (message.id > this.lastMessageId) {
          console.log(`🆕 НОВОЕ СООБЩЕНИЕ #${message.id}: "${(message.message || '').substring(0, 50)}..."`);
          
          // Обновляем последний ID
          this.lastMessageId = message.id;
          
          // Обрабатываем сообщение
          await this.handleNewMessage(message);
        }
      }
      
    } catch (error) {
      console.error('❌ Ошибка проверки сообщений:', error);
    }
  }

  async handleNewMessage(message) {
    try {
      // ОБРАБАТЫВАЕМ ВСЕ СООБЩЕНИЯ! НЕ ПРОПУСКАЕМ НИЧЕГО!
      console.log(`📝 Обработка сообщения: out=${message.out}, from_self=${message.out ? 'ДА' : 'НЕТ'}`);
      
      // Проверяем что есть текст сообщения
      if (!message.message) {
        console.log('⏭️ Пропуск сообщения без текста');
        return;
      }
      
      const messageText = message.message;
      console.log(`📩 Новое сообщение в АНТИЛОПА #${message.id}: ${messageText.substring(0, 50)}...`);
      
      // Проверяем триггерную фразу
      if (messageText.toUpperCase().includes(this.triggerPhrase)) {
        console.log('🎯 НАЙДЕНА ТРИГГЕРНАЯ ФРАЗА!');
        await this.processSearchRequest(messageText, message);
      }
      
    } catch (error) {
      console.error('❌ Ошибка обработки сообщения:', error);
    }
  }

  isFromAntilopaGroup(message) {
    if (!message.peerId) return false;
    
    // Нормализуем ID как в realtime_parser.js
    const normalizeId = (id) => String(id?.value ?? id);
    
    if (message.peerId.className === 'PeerChannel') {
      const channelId = normalizeId(message.peerId.channelId);
      const targetId = Math.abs(this.antilopaGroupId).toString(); // Убираем минус из ID
      console.log(`🔍 Сравниваю канал ID: ${channelId} с целевым: ${targetId}`);
      return channelId === targetId;
    } else if (message.peerId.className === 'PeerChat') {
      const chatId = normalizeId(message.peerId.chatId);
      const targetId = Math.abs(this.antilopaGroupId).toString(); // Убираем минус из ID
      console.log(`🔍 Сравниваю чат ID: ${chatId} с целевым: ${targetId}`);
      return chatId === targetId;
    }
    
    return false;
  }

  async processSearchRequest(messageText, originalMessage) {
    try {
      console.log('🔍 Обнаружен запрос на поиск!');
      
      // Извлекаем поисковый запрос после триггерной фразы
      const searchQuery = this.extractSearchQuery(messageText);
      
      if (!searchQuery) {
        await this.sendReplyToGroup('❌ Не указан поисковый запрос. Используйте: ПОИСК ПО ТЕЛЕГЕ ваш запрос');
        return;
      }
      
      console.log(`🎯 Поисковый запрос: "${searchQuery}"`);
      
      // Отправляем сообщение о начале поиска
      await this.sendReplyToGroup(`🔍 Выполняю поиск по запросу: "${searchQuery}"\n⏳ Пожалуйста, подождите...`);
      
      // Выполняем НАСТОЯЩИЙ глобальный поиск
      const results = await this.searchEngine.searchChannels(searchQuery, {
        limit: 15
      });
      
      // Отправляем результаты
      await this.sendSearchResults(searchQuery, results);
      
    } catch (error) {
      console.error('❌ Ошибка обработки поискового запроса:', error);
      await this.sendReplyToGroup(`❌ Ошибка поиска: ${error.message}`);
    }
  }

  extractSearchQuery(messageText) {
    // Находим позицию триггерной фразы
    const triggerIndex = messageText.toUpperCase().indexOf(this.triggerPhrase);
    if (triggerIndex === -1) return null;
    
    // Извлекаем текст после триггерной фразы
    const queryStart = triggerIndex + this.triggerPhrase.length;
    const query = messageText.substring(queryStart).trim();
    
    return query || null;
  }

  async sendSearchResults(query, results) {
    try {
      if (results.length === 0) {
        await this.sendReplyToGroup(`❌ По запросу "${query}" ничего не найдено.\n\n💡 Попробуйте:\n• Изменить запрос\n• Использовать синонимы\n• Поиск на английском языке`);
        return;
      }
      
      // Формируем сообщение с результатами
      let message = `🎯 *Результаты поиска: "${query}"*\n`;
      message += `📊 Найдено: ${results.length} каналов/групп\n\n`;
      
      // Добавляем топ-10 результатов
      const topResults = results.slice(0, 10);
      
      for (let i = 0; i < topResults.length; i++) {
        const result = topResults[i];
        const number = i + 1;
        
        message += `${number}. *${result.title}*\n`;
        message += `${result.type === 'channel' ? '📺' : '👥'} ${result.type === 'channel' ? 'Канал' : 'Группа'}`;
        
        if (result.verified) message += ' ✅';
        message += `\n`;
        
        if (result.participantsCount) {
          message += `👥 ${result.participantsCount.toLocaleString('ru-RU')} участников\n`;
        }
        
        message += `🏷️ ${result.category}\n`;
        
        if (result.description) {
          const desc = result.description.length > 80 
            ? result.description.substring(0, 80) + '...'
            : result.description;
          message += `📝 ${desc}\n`;
        }
        
        if (result.link) {
          message += `🔗 ${result.link}\n`;
        }
        
        message += `\n`;
      }
      
      // Если результатов больше 10, добавляем информацию
      if (results.length > 10) {
        message += `... и еще ${results.length - 10} результатов\n\n`;
      }
      
      message += `⏰ Поиск выполнен: ${new Date().toLocaleString('ru-RU')}`;
      
      // Отправляем результаты (разбиваем на части если сообщение слишком длинное)
      await this.sendLongMessage(message);
      
    } catch (error) {
      console.error('❌ Ошибка отправки результатов:', error);
      await this.sendReplyToGroup(`❌ Ошибка отправки результатов: ${error.message}`);
    }
  }

  async sendLongMessage(message) {
    const maxLength = 4000; // Telegram лимит примерно 4096 символов
    
    if (message.length <= maxLength) {
      await this.sendReplyToGroup(message);
      return;
    }
    
    // Разбиваем длинное сообщение на части
    const parts = [];
    let currentPart = '';
    const lines = message.split('\n');
    
    for (let line of lines) {
      if ((currentPart + line + '\n').length > maxLength) {
        if (currentPart) {
          parts.push(currentPart.trim());
          currentPart = '';
        }
      }
      currentPart += line + '\n';
    }
    
    if (currentPart.trim()) {
      parts.push(currentPart.trim());
    }
    
    // Отправляем части с небольшой задержкой
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partHeader = parts.length > 1 ? `📄 Часть ${i + 1}/${parts.length}\n\n` : '';
      
      await this.sendReplyToGroup(partHeader + part);
      
      // Задержка между сообщениями
      if (i < parts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async sendReplyToGroup(message) {
    try {
      // Используем тот же метод что и в goodnight-message.js
      await this.client.sendMessage(this.antilopaGroupId, { message });
      
      console.log(`✅ Сообщение отправлено в группу АНТИЛОПА`);
      
    } catch (error) {
      console.error('❌ Ошибка отправки сообщения в группу:', error);
    }
  }

  async getStats() {
    const stats = this.searchEngine.getSearchStats();
    
    return {
      isRunning: this.isRunning,
      antilopaGroupId: this.antilopaGroupId,
      triggerPhrase: this.triggerPhrase,
      searchEngineStats: stats,
      uptime: process.uptime()
    };
  }

  async stop() {
    console.log('🛑 Остановка мониторинга...');
    this.isRunning = false;
    
    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
      
      if (this.client) {
        await this.client.disconnect();
      }
      console.log('✅ Мониторинг остановлен');
    } catch (error) {
      console.error('❌ Ошибка остановки:', error);
    }
  }
}

// Запуск мониторинга
async function startAntilopaMonitor() {
  const monitor = new AntilopaSearchMonitor();
  
  try {
    await monitor.init();
    await monitor.startMonitoring();
    
    // Graceful shutdown
    process.once('SIGINT', async () => {
      console.log('\n🛑 Получен сигнал остановки...');
      await monitor.stop();
      process.exit(0);
    });
    
    process.once('SIGTERM', async () => {
      console.log('\n🛑 Получен сигнал завершения...');
      await monitor.stop();
      process.exit(0);
    });
    
    // Отправляем сообщение о запуске в группу
    setTimeout(async () => {
      try {
        await monitor.sendReplyToGroup(`🚀 Поисковый модуль запущен и готов к работе!\n\n💡 Для поиска каналов напишите:\nПОИСК ПО ТЕЛЕГЕ ваш запрос\n\nПример: ПОИСК ПО ТЕЛЕГЕ криптовалюты`);
      } catch (error) {
        console.log('Не удалось отправить приветственное сообщение');
      }
    }, 3000);
    
    console.log('🎉 AntilopaSearchMonitor запущен и мониторит группу!');
    
    // Показываем статистику каждые 10 минут
    setInterval(async () => {
      const stats = await monitor.getStats();
      console.log(`📊 Статистика: Работает ${Math.floor(stats.uptime / 60)} мин, Группа: ${stats.antilopaGroupId}`);
    }, 10 * 60 * 1000);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startAntilopaMonitor();
}

module.exports = { AntilopaSearchMonitor };

