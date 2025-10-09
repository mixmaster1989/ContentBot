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
    this.lastMessageId = 0;
    this.pollingInterval = null;
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
      await this.searchEngine.init(this.client); // Pass client to searchEngine
      
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
      // Используем хардкод ID как в goodnight-message.js
      this.antilopaGroupId = -1002686615681;
      console.log(`✅ Используем ID группы АНТИЛОПА: ${this.antilopaGroupId}`);
      
    } catch (error) {
      console.error('❌ Ошибка поиска группы АНТИЛОПА:', error);
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
      const messages = await this.client.getMessages(this.antilopaGroupId, { limit: 10 });
      console.log(`📬 Найдено ${messages.length} сообщений, последний ID: ${this.lastMessageId}`);
      
      for (const message of messages) {
        if (message.id > this.lastMessageId) {
          console.log(`🆕 НОВОЕ СООБЩЕНИЕ #${message.id}: "${(message.message || '').substring(0, 50)}..."`);
          this.lastMessageId = message.id;
          await this.handleNewMessage(message);
        }
      }
    } catch (error) {
      console.error('❌ Ошибка проверки сообщений:', error);
    }
  }

  async handleNewMessage(message) {
    try {
      // Проверяем что сообщение из группы АНТИЛОПА
      if (!this.isFromAntilopaGroup(message)) {
        console.log('⏭️ Сообщение не из группы АНТИЛОПА');
        return;
      }

      // ОБРАБАТЫВАЕМ ВСЕ СООБЩЕНИЯ! НЕ ПРОПУСКАЕМ НИЧЕГО!
      console.log(`📝 Обработка сообщения: out=${message.out}, from_self=${message.out ? 'ДА' : 'НЕТ'}`);

      // Проверяем что есть текст сообщения
      if (!message.message) {
        console.log('⏭️ Пропуск сообщения без текста');
        return;
      }

      const messageText = message.message;
      console.log(`📩 Новое сообщение в АНТИЛОПА #${message.id}: ${messageText.substring(0, 50)}...`);

      if (messageText.toUpperCase().includes(this.triggerPhrase)) {
        console.log('🎯 НАЙДЕНА ТРИГГЕРНАЯ ФРАЗА!');
        await this.processSearchRequest(messageText, message);
      }
      
    } catch (error) {
      console.error('❌ Ошибка обработки сообщения:', error);
    }
  }

  isFromAntilopaGroup(message) {
    // Проверяем и PeerChannel и PeerChat
    const peerId = message.peerId;
    console.log(`🔍 Проверка сообщения: peerId=${peerId?.className}, channelId=${peerId?.channelId}, chatId=${peerId?.chatId}`);
    console.log(`🎯 Ожидаемый ID группы: ${this.antilopaGroupId}`);
    
    if (!peerId) {
      console.log('❌ Нет peerId');
      return false;
    }
    
    if (peerId.className === 'PeerChannel' || peerId.className === 'PeerChat') {
      const messageGroupId = peerId.channelId || peerId.chatId;
      console.log(`📊 ID сообщения: ${messageGroupId}, целевой ID: ${this.antilopaGroupId}`);
      
      // Для каналов добавляем префикс -100 если его нет
      let fullMessageId = messageGroupId;
      if (peerId.className === 'PeerChannel' && messageGroupId > 0) {
        fullMessageId = -1000000000000 - messageGroupId;
        console.log(`🔧 Конвертированный ID канала: ${fullMessageId}`);
      }
      
      const isMatch = fullMessageId === this.antilopaGroupId;
      console.log(`🎯 Совпадение: ${isMatch}`);
      return isMatch;
    }
    
    console.log(`❌ Неизвестный тип peer: ${peerId.className}`);
    return false;
  }

  async processSearchRequest(messageText, originalMessage) {
    try {
      console.log('🎯 Обработка поискового запроса...');
      
      // Извлекаем поисковый запрос
      const searchQuery = this.extractSearchQuery(messageText);
      if (!searchQuery) {
        console.log('⚠️ Не удалось извлечь поисковый запрос');
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
      await this.sendReplyToGroup(`❌ Ошибка при выполнении поиска: ${error.message}`);
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
      console.log(`📊 ОТПРАВКА РЕЗУЛЬТАТОВ: найдено ${results?.length || 0} каналов`);
      
      // Используем встроенное форматирование из RealGlobalSearch
      const message = this.searchEngine.formatResultsForChat(results, query);
      console.log(`📝 Сообщение сформировано, длина: ${message.length} символов`);
      
      await this.sendReplyToGroup(message);
      console.log(`✅ Результаты отправлены в группу`);
      
    } catch (error) {
      console.error('❌ Ошибка отправки результатов:', error);
      await this.sendReplyToGroup(`❌ Ошибка при отправке результатов поиска: ${error.message}`);
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

async function main() {
  const monitor = new AntilopaSearchMonitor();
  
  try {
    await monitor.init();
    await monitor.startMonitoring();
    
    // Обработчик graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n📡 Получен сигнал остановки...');
      await monitor.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n📡 Получен сигнал завершения...');
      await monitor.stop();
      process.exit(0);
    });
    
    // Держим процесс живым
    setInterval(() => {
      // Проверяем что процесс ещё работает
      if (!monitor.isRunning) {
        console.log('⚠️ Мониторинг остановлен, перезапускаем...');
        monitor.startMonitoring();
      }
    }, 30000);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AntilopaSearchMonitor;
