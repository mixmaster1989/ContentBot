#!/bin/bash

echo "🛑 Остановка мониторинга группы АНТИЛОПА"
echo "======================================="

# Показываем текущий статус
echo "📊 Текущий статус:"
pm2 status antilopa-search-monitor

echo ""
echo "🛑 Останавливаю процесс..."

# Останавливаем процесс
pm2 stop antilopa-search-monitor

echo ""
echo "🗑️ Удаляю процесс из PM2..."

# Удаляем процесс
pm2 delete antilopa-search-monitor

echo ""
echo "✅ Мониторинг остановлен!"

# Показываем финальный статус
echo ""
echo "📊 Финальный статус:"
pm2 status


