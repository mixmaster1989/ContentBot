#!/bin/bash

echo "📊 СТАТУС МОНИТОРИНГА ГРУППЫ АНТИЛОПА"
echo "====================================="

# Проверяем статус PM2
echo "🔍 Статус PM2 процесса:"
pm2 status antilopa-search-monitor

echo ""
echo "💾 Использование памяти:"
pm2 monit --no-daemon | head -10

echo ""
echo "📝 Последние логи (20 строк):"
pm2 logs antilopa-search-monitor --lines 20 --nostream

echo ""
echo "📈 Информация о процессе:"
pm2 show antilopa-search-monitor

echo ""
echo "🔧 Команды управления:"
echo "pm2 logs antilopa-search-monitor        # Просмотр логов"
echo "pm2 restart antilopa-search-monitor     # Перезапуск"
echo "pm2 stop antilopa-search-monitor        # Остановка"
echo "pm2 start antilopa-search-monitor       # Запуск"


