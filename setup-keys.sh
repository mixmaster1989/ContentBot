#!/bin/bash

echo "🔑 Помощник настройки API ключей ContentBot"
echo "============================================"
echo ""

# Проверяем существование .env
if [ -f .env ]; then
    echo "📝 Файл .env уже существует. Создаю резервную копию..."
    cp .env .env.backup.$(date +%s)
else
    echo "📝 Создаю новый .env файл..."
    cp config/.env.example .env
fi

echo ""
echo "🔍 Проверяю текущие настройки..."
echo ""

# Функция проверки ключа
check_key() {
    local key=$1
    local description=$2
    local value=$(grep "^$key=" .env 2>/dev/null | cut -d'=' -f2)
    
    if [ -z "$value" ] || [ "$value" = "your_${key,,}" ] || [ "$value" = "your_${key,,//_/}" ]; then
        echo "❌ $key - НЕ НАСТРОЕН ($description)"
        return 1
    else
        echo "✅ $key - настроен"
        return 0
    fi
}

# Проверяем все ключи
echo "📱 TELEGRAM API:"
check_key "API_ID" "от https://my.telegram.org"
check_key "API_HASH" "от https://my.telegram.org"
check_key "BOT_TOKEN" "от @BotFather (основной бот)"
check_key "ADMIN_BOT_TOKEN" "от @BotFather (админ-бот)"

echo ""
echo "🧠 LLM:"
check_key "OPENAI_API_KEY" "от https://platform.openai.com"

echo ""
echo "👑 АДМИН:"
check_key "OWNER_ID" "твой Telegram ID"

echo ""
echo "💰 ПЛАТЕЖИ (опционально):"
check_key "YOOMONEY_TOKEN" "от https://yoomoney.ru/dev" || echo "   ⚠️  Без этого ключа ЮMoney платежи работать не будут"
check_key "CRYPTO_WALLET" "USDT кошелек" || echo "   ⚠️  Без этого криптоплатежи работать не будут"

echo ""
echo "📋 ИНСТРУКЦИИ:"
echo ""
echo "1. 📱 Telegram API (https://my.telegram.org):"
echo "   - Войди через телефон"
echo "   - API Development tools → Create application"
echo "   - Скопируй API_ID и API_HASH"
echo ""
echo "2. 🤖 Создай ботов (@BotFather):"
echo "   - /newbot → ContentBot (основной)"  
echo "   - /newbot → ContentBot Admin (админ)"
echo "   - Скопируй токены"
echo ""
echo "3. 🧠 OpenAI API (https://platform.openai.com/api-keys):"
echo "   - Create new secret key"
echo "   - ВАЖНО: Нужен баланс на аккаунте!"
echo ""
echo "4. 👤 Твой ID (@userinfobot):"
echo "   - Напиши боту, получи свой ID"
echo ""
echo "5. 💰 ЮMoney (опционально):"
echo "   - https://yoomoney.ru/dev"
echo "   - Создай приложение, получи токен"
echo ""

# Интерактивная настройка
echo "🛠️  Хочешь настроить ключи прямо сейчас? (y/n)"
read -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔧 Интерактивная настройка:"
    echo ""
    
    # API_ID
    echo -n "📱 Введи API_ID (от my.telegram.org): "
    read api_id
    if [ ! -z "$api_id" ]; then
        sed -i "s/API_ID=.*/API_ID=$api_id/" .env
        echo "✅ API_ID сохранен"
    fi
    
    # API_HASH  
    echo -n "📱 Введи API_HASH (от my.telegram.org): "
    read api_hash
    if [ ! -z "$api_hash" ]; then
        sed -i "s/API_HASH=.*/API_HASH=$api_hash/" .env
        echo "✅ API_HASH сохранен"
    fi
    
    # BOT_TOKEN
    echo -n "🤖 Введи BOT_TOKEN (от @BotFather): "
    read bot_token
    if [ ! -z "$bot_token" ]; then
        sed -i "s/BOT_TOKEN=.*/BOT_TOKEN=$bot_token/" .env
        echo "✅ BOT_TOKEN сохранен"
    fi
    
    # ADMIN_BOT_TOKEN
    echo -n "👑 Введи ADMIN_BOT_TOKEN (от @BotFather): "
    read admin_token
    if [ ! -z "$admin_token" ]; then
        sed -i "s/ADMIN_BOT_TOKEN=.*/ADMIN_BOT_TOKEN=$admin_token/" .env
        echo "✅ ADMIN_BOT_TOKEN сохранен"
    fi
    
    # OPENAI_API_KEY
    echo -n "🧠 Введи OPENAI_API_KEY (от platform.openai.com): "
    read openai_key
    if [ ! -z "$openai_key" ]; then
        sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$openai_key/" .env
        echo "✅ OPENAI_API_KEY сохранен"
    fi
    
    # OWNER_ID
    echo -n "👤 Введи свой Telegram ID (от @userinfobot): "
    read owner_id
    if [ ! -z "$owner_id" ]; then
        sed -i "s/OWNER_ID=.*/OWNER_ID=$owner_id/" .env
        echo "✅ OWNER_ID сохранен"
    fi
    
    echo ""
    echo "💾 Настройки сохранены в .env"
fi

echo ""
echo "📝 Отредактируй файл .env вручную:"
echo "   nano .env"
echo ""
echo "🚀 После настройки запускай:"
echo "   ./start.sh pm2"
echo ""
echo "🔍 Проверить настройки снова:"
echo "   ./setup-keys.sh" 