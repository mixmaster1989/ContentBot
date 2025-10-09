#!/usr/bin/env node

/**
 * Запуск ContentBot с интегрированным поисковым модулем
 * 
 * Этот скрипт запускает полную версию ContentBot с новым модулем поиска каналов
 * и групп Telegram, который работает как "Telegram Google".
 */

require('dotenv').config();
const { ContentBotSearchEnhanced } = require('./core/contentbot-search-enhanced');
const path = require('path');
const fs = require('fs');

// Логотип и информация о запуске
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🤖 ContentBot с поисковым модулем "Telegram Google"        ║
║                                                              ║
║   🔍 Глобальный поиск каналов и групп                        ║
║   📊 Аналитика и тренды                                      ║
║   💾 Экспорт результатов                                     ║
║   🎯 Интеллектуальная фильтрация                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Проверка окружения
function checkEnvironment() {
  console.log('🔍 Проверка конфигурации...');
  
  const requiredEnvVars = [
    'BOT_TOKEN',
    'API_ID', 
    'API_HASH',
    'MONTHLY_PRICE',
    'CHANNEL_SETUP_PRICE',
    'PREMIUM_PRICE'
  ];
  
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Отсутствуют обязательные переменные окружения:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Создайте файл .env с необходимыми переменными');
    process.exit(1);
  }
  
  console.log('✅ Конфигурация проверена');
}

// Проверка директорий
function checkDirectories() {
  console.log('📁 Проверка директорий...');
  
  const requiredDirs = [
    './data',
    './logs',
    './core'
  ];
  
  for (let dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.log(`📁 Создаю директорию: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  console.log('✅ Директории готовы');
}

// Проверка файлов базы данных
function checkDatabase() {
  console.log('🗄️ Проверка базы данных...');
  
  const dbPath = './data/contentbot.db';
  if (!fs.existsSync(dbPath)) {
    console.log('🆕 База данных будет создана при первом запуске');
  } else {
    console.log('✅ База данных найдена');
  }
}

// Отображение доступных команд
function showAvailableCommands() {
  console.log(`
🎯 ДОСТУПНЫЕ КОМАНДЫ БОТА:

📝 КОНТЕНТ:
  /start        - Главное меню
  /demo         - Демо-пост
  /order        - Заказать канал
  /channels     - Мои каналы
  /analytics    - Аналитика (премиум)

🔍 ПОИСК:
  /search <запрос>     - Быстрый поиск
  /search_advanced     - Расширенный поиск
  /search_category     - Поиск по категориям
  /search_trends       - Трендовые каналы
  /search_history      - История поиска
  /search_recommend    - Рекомендации

⚙️ СИСТЕМА:
  /help         - Полная справка
  /status       - Статус системы
  /feedback     - Обратная связь

💡 ПРИМЕРЫ ПОИСКА:
  /search криптовалюты
  /search новости россия
  /search игры steam
  /search обучение python
`);
}

// Отображение информации о поисковых возможностях
function showSearchFeatures() {
  console.log(`
🔍 ВОЗМОЖНОСТИ ПОИСКОВОГО МОДУЛЯ:

🎯 ТИПЫ ПОИСКА:
  • Глобальный поиск по всему Telegram
  • Поиск по 20+ категориям
  • Интеллектуальный поиск с синонимами
  • Поиск в каналах-каталогах
  • Поиск с множественными фильтрами

📊 ФИЛЬТРЫ:
  • Тип: каналы/группы/все
  • Размер: от минимума до максимума участников
  • Верификация: только верифицированные
  • Категория: любая из доступных тематик
  • Наличие username для прямых ссылок

💾 ЭКСПОРТ:
  • JSON - для программной обработки
  • CSV - для таблиц и анализа
  • Markdown - для документации

📈 АНАЛИТИКА:
  • Трендовые каналы за период
  • История поисковых запросов
  • Статистика использования
  • Персональные рекомендации
`);
}

// Основная функция запуска
async function startBot() {
  try {
    console.log('\n🚀 Запуск ContentBot с поисковым модулем...\n');
    
    // Выполняем проверки
    checkEnvironment();
    checkDirectories(); 
    checkDatabase();
    
    console.log('🤖 Инициализация бота...');
    
    // Создаем и запускаем бота
    const contentBot = new ContentBotSearchEnhanced();
    
    // Graceful shutdown
    process.once('SIGINT', async () => {
      console.log('\n🛑 Получен сигнал остановки...');
      await contentBot.stop();
      process.exit(0);
    });
    
    process.once('SIGTERM', async () => {
      console.log('\n🛑 Получен сигнал завершения...');
      await contentBot.stop();
      process.exit(0);
    });
    
    // Обработка необработанных ошибок
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Необработанная ошибка Promise:', reason);
      console.error('   В промисе:', promise);
    });
    
    process.on('uncaughtException', (error) => {
      console.error('❌ Необработанное исключение:', error);
      process.exit(1);
    });
    
    // Запускаем бота
    await contentBot.start();
    
    console.log('\n🎉 ContentBot с поисковым модулем успешно запущен!');
    console.log('📱 Бот готов принимать команды в Telegram');
    
    // Показываем доступные команды
    showAvailableCommands();
    showSearchFeatures();
    
    console.log(`
💡 ПОЛЕЗНЫЕ ССЫЛКИ:
  • Документация: ./SEARCH_MODULE_README.md
  • Демо поиска: node demo-search-functionality.js
  • Логи системы: ./logs/
  • База данных: ./data/contentbot.db

🔧 ДЛЯ ОСТАНОВКИ:
  • Ctrl+C или Kill сигнал
  • Бот корректно завершит все операции

⚡ СТАТУС: Бот работает и ожидает команды...
`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка при запуске:', error);
    process.exit(1);
  }
}

// Запуск с обработкой аргументов командной строки
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Использование: node start-search-enhanced.js [опции]

Опции:
  --help, -h     Показать эту справку
  --demo         Запустить демо поискового модуля
  --status       Показать статус без запуска
  
Примеры:
  node start-search-enhanced.js                # Обычный запуск
  node start-search-enhanced.js --demo         # Запуск демо
  node start-search-enhanced.js --status       # Проверка статуса
`);
    process.exit(0);
  }
  
  if (args.includes('--demo')) {
    console.log('🎬 Запуск демонстрации поискового модуля...');
    require('./demo-search-functionality.js');
    return;
  }
  
  if (args.includes('--status')) {
    console.log('📊 Проверка статуса системы...');
    checkEnvironment();
    checkDirectories();
    checkDatabase();
    console.log('✅ Все системы готовы к запуску');
    process.exit(0);
  }
  
  // Обычный запуск
  startBot();
}

module.exports = { startBot };


