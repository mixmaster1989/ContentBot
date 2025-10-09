#!/bin/bash

echo "🔍 Проверка .env файла..."

if [ -f ".env" ]; then
    echo "✅ .env файл найден"
    echo "📋 Проверяем наличие основных переменных:"
    
    # Проверяем наличие ключевых переменных без вывода их значений
    if grep -q "BOT_TOKEN=" .env; then
        echo "  ✅ BOT_TOKEN присутствует"
    else
        echo "  ❌ BOT_TOKEN отсутствует"
    fi
    
    if grep -q "API_ID=" .env; then
        echo "  ✅ API_ID присутствует"
    else
        echo "  ❌ API_ID отсутствует"
    fi
    
    if grep -q "API_HASH=" .env; then
        echo "  ✅ API_HASH присутствует"
    else
        echo "  ❌ API_HASH отсутствует"
    fi
    
    if grep -q "MONTHLY_PRICE=" .env; then
        echo "  ✅ MONTHLY_PRICE присутствует"
    else
        echo "  ❌ MONTHLY_PRICE отсутствует"
    fi
    
    if grep -q "CHANNEL_SETUP_PRICE=" .env; then
        echo "  ✅ CHANNEL_SETUP_PRICE присутствует"
    else
        echo "  ❌ CHANNEL_SETUP_PRICE отсутствует"
    fi
    
    if grep -q "PREMIUM_PRICE=" .env; then
        echo "  ✅ PREMIUM_PRICE присутствует"
    else
        echo "  ❌ PREMIUM_PRICE отсутствует"
    fi
    
    echo ""
    echo "📊 Общее количество переменных в .env:"
    grep -c "=" .env
    
else
    echo "❌ .env файл не найден"
    exit 1
fi

echo "🔒 Проверка завершена безопасно"


