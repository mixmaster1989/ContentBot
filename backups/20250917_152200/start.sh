#!/bin/bash

# ContentBot - Стартовый скрипт
echo "🚀 Запуск ContentBot..."

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "📝 Скопируйте config/.env.example в .env и настройте параметры"
    exit 1
fi

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не установлен!"
    exit 1
fi

# Проверяем npm пакеты
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
fi

# Создаем необходимые папки
mkdir -p data logs

echo "✅ Подготовка завершена"
echo ""

# Функция для запуска с PM2
start_with_pm2() {
    if command -v pm2 &> /dev/null; then
        echo "🔄 Запуск через PM2..."
        
        # Останавливаем существующие процессы
        pm2 delete contentbot-main 2>/dev/null || true
        pm2 delete contentbot-admin 2>/dev/null || true
        
        # Запускаем основной бот
        pm2 start core/contentbot-main.js --name "contentbot-main" --log-date-format="YYYY-MM-DD HH:mm:ss"
        
        # Запускаем админ-бота  
        pm2 start admin/admin-bot.js --name "contentbot-admin" --log-date-format="YYYY-MM-DD HH:mm:ss"
        
        echo "✅ ContentBot запущен через PM2"
        echo "📊 Мониторинг: pm2 monit"
        echo "📋 Логи: pm2 logs"
        echo "🛑 Остановка: pm2 stop all"
        
    else
        echo "❌ PM2 не установлен. Установите: npm install -g pm2"
        start_manual
    fi
}

# Функция для ручного запуска
start_manual() {
    echo "🔄 Ручной запуск..."
    echo "⚠️  Запустите админ-бота в отдельном терминале: npm run admin"
    echo ""
    echo "🤖 Запуск основного бота..."
    npm start
}

# Проверяем аргументы
case "$1" in
    "pm2")
        start_with_pm2
        ;;
    "manual")
        start_manual
        ;;
    "admin")
        echo "👑 Запуск только админ-бота..."
        npm run admin
        ;;
    "dev")
        echo "🛠️ Режим разработки..."
        npm run dev
        ;;
    "stop")
        echo "🛑 Остановка ContentBot..."
        if command -v pm2 &> /dev/null; then
            pm2 stop contentbot-main contentbot-admin
            pm2 delete contentbot-main contentbot-admin
        else
            pkill -f "contentbot"
        fi
        echo "✅ Остановлен"
        ;;
    "status")
        echo "📊 Статус ContentBot..."
        if command -v pm2 &> /dev/null; then
            pm2 list | grep contentbot
        else
            ps aux | grep contentbot | grep -v grep
        fi
        ;;
    "logs")
        echo "📋 Логи ContentBot..."
        if command -v pm2 &> /dev/null; then
            pm2 logs contentbot
        else
            tail -f logs/contentbot.log
        fi
        ;;
    "restart")
        echo "🔄 Перезапуск ContentBot..."
        $0 stop
        sleep 2
        $0 pm2
        ;;
    "update")
        echo "📦 Обновление зависимостей..."
        npm update
        echo "✅ Обновлено"
        ;;
    "backup")
        echo "💾 Создание бэкапа..."
        BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp -r data/ "$BACKUP_DIR/"
        cp .env "$BACKUP_DIR/"
        echo "✅ Бэкап создан: $BACKUP_DIR"
        ;;
    "install")
        echo "🛠️ Полная установка ContentBot..."
        npm install
        cp config/.env.example .env
        echo "📝 Настройте файл .env и запустите: ./start.sh pm2"
        ;;
    *)
        echo "🤖 ContentBot - Нейро-контент агентство"
        echo ""
        echo "Использование: ./start.sh [команда]"
        echo ""
        echo "Команды:"
        echo "  pm2      - Запуск через PM2 (рекомендуется)"
        echo "  manual   - Ручной запуск"
        echo "  admin    - Только админ-бот"
        echo "  dev      - Режим разработки"
        echo "  stop     - Остановить все процессы"
        echo "  restart  - Перезапустить"
        echo "  status   - Статус процессов"
        echo "  logs     - Просмотр логов"
        echo "  update   - Обновить зависимости"
        echo "  backup   - Создать бэкап"
        echo "  install  - Полная установка"
        echo ""
        echo "Примеры:"
        echo "  ./start.sh pm2      # Запуск продакшен"
        echo "  ./start.sh dev      # Разработка"
        echo "  ./start.sh logs     # Просмотр логов"
        echo ""
        
        # Автозапуск через PM2 если нет аргументов
        read -p "Запустить через PM2? (y/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            start_with_pm2
        else
            start_manual
        fi
        ;;
esac 