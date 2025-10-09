#!/bin/bash

echo "🚀 Запуск мониторинга группы АНТИЛОПА через PM2"
echo "=============================================="

# Переходим в директорию проекта
cd /home/user1/ContentBot

# Проверяем что PM2 установлен
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 не установлен. Устанавливаю..."
    npm install -g pm2
fi

# Создаем папку для логов если не существует
mkdir -p logs

# Проверяем .env файл
echo "🔍 Проверка конфигурации..."
if [ ! -f ".env" ]; then
    echo "❌ .env файл не найден!"
    exit 1
fi

# Проверяем основные переменные
if ! grep -q "API_ID=" .env || ! grep -q "API_HASH=" .env; then
    echo "❌ Отсутствуют API_ID или API_HASH в .env файле!"
    exit 1
fi

echo "✅ Конфигурация проверена"

# Останавливаем если уже запущен
echo "🛑 Останавливаю предыдущий процесс..."
pm2 stop antilopa-search-monitor 2>/dev/null || true
pm2 delete antilopa-search-monitor 2>/dev/null || true

# Запускаем через PM2
echo "🚀 Запускаю мониторинг..."
pm2 start ecosystem.config.js

# Показываем статус
echo ""
echo "📊 Статус процесса:"
pm2 status

echo ""
echo "📝 Просмотр логов:"
echo "pm2 logs antilopa-search-monitor     # Все логи"
echo "pm2 logs antilopa-search-monitor --lines 50  # Последние 50 строк"

echo ""
echo "🛑 Остановка:"
echo "pm2 stop antilopa-search-monitor"
echo "pm2 delete antilopa-search-monitor"

echo ""
echo "✅ Мониторинг группы АНТИЛОПА запущен!"
echo "💡 Теперь пишите в группе: ПОИСК ПО ТЕЛЕГЕ ваш запрос"

# Сохраняем конфигурацию PM2
pm2 save


