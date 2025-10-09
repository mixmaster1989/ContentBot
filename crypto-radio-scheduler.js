require('dotenv').config();
const cron = require('node-cron');
const { CryptoRadioDJ } = require('./core/crypto-radio-dj');

class CryptoRadioScheduler {
  constructor() {
    this.dj = new CryptoRadioDJ();
    this.isRunning = false;
  }

  async init() {
    await this.dj.init();
    console.log('✅ Крипторадио диджей инициализирован');
  }

  startScheduler() {
    // Запуск каждые 4 часа
    cron.schedule('0 */4 * * *', async () => {
      if (this.isRunning) {
        console.log('⏰ Пропускаю запуск - предыдущий еще выполняется');
        return;
      }

      this.isRunning = true;
      console.log('🎧 Запускаю создание подкаста...');
      
      try {
        await this.dj.createPodcast();
        console.log('✅ Подкаст создан успешно');
      } catch (error) {
        console.error('❌ Ошибка создания подкаста:', error.message);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('⏰ Планировщик запущен - подкасты будут создаваться каждые 4 часа');
  }

  async createPodcastNow() {
    if (this.isRunning) {
      console.log('⏰ Дождитесь завершения текущего процесса');
      return;
    }

    this.isRunning = true;
    console.log('🎧 Создаю подкаст прямо сейчас...');
    
    try {
      await this.dj.createPodcast();
      console.log('✅ Подкаст создан успешно');
    } catch (error) {
      console.error('❌ Ошибка создания подкаста:', error.message);
    } finally {
      this.isRunning = false;
    }
  }

  async stop() {
    await this.dj.stop();
    console.log('✅ Крипторадио диджей остановлен');
  }
}

// Запуск планировщика
if (require.main === module) {
  const scheduler = new CryptoRadioScheduler();
  
  scheduler.init().then(() => {
    scheduler.startScheduler();
    
    // Создать подкаст сразу при запуске
    setTimeout(() => {
      scheduler.createPodcastNow();
    }, 5000);
    
    // Обработка сигналов завершения
    process.on('SIGINT', async () => {
      console.log('\n🛑 Получен сигнал завершения...');
      await scheduler.stop();
      process.exit(0);
    });
  });
}

module.exports = { CryptoRadioScheduler };
