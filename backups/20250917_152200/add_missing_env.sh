#!/bin/bash

echo "🔧 Добавление недостающих переменных в .env..."

# Проверяем и добавляем отсутствующие переменные без перезаписи существующих
if ! grep -q "BOT_TOKEN=" .env; then
    echo "➕ Добавляю BOT_TOKEN (заглушка - замените на реальный)"
    echo "" >> .env
    echo "# Токен основного бота" >> .env
    echo "BOT_TOKEN=your_bot_token_here" >> .env
fi

if ! grep -q "MONTHLY_PRICE=" .env; then
    echo "➕ Добавляю MONTHLY_PRICE"
    echo "" >> .env
    echo "# Цены для ContentBot" >> .env
    echo "MONTHLY_PRICE=3000" >> .env
fi

if ! grep -q "CHANNEL_SETUP_PRICE=" .env; then
    echo "➕ Добавляю CHANNEL_SETUP_PRICE"
    echo "CHANNEL_SETUP_PRICE=10000" >> .env
fi

if ! grep -q "PREMIUM_PRICE=" .env; then
    echo "➕ Добавляю PREMIUM_PRICE"
    echo "PREMIUM_PRICE=15000" >> .env
fi

if ! grep -q "OPENAI_API_KEY=" .env; then
    echo "➕ Добавляю OPENAI_API_KEY (заглушка)"
    echo "" >> .env
    echo "# OpenAI для LLM" >> .env
    echo "OPENAI_API_KEY=your_openai_key_here" >> .env
fi

if ! grep -q "OWNER_ID=" .env; then
    echo "➕ Добавляю OWNER_ID (заглушка)"
    echo "" >> .env
    echo "# ID владельца бота" >> .env
    echo "OWNER_ID=123456789" >> .env
fi

echo "✅ Переменные добавлены. Проверяем результат:"
echo ""
./check_env.sh


