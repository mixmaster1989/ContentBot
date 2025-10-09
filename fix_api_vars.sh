#!/bin/bash

echo "🔧 Добавление алиасов для API переменных..."

# Добавляем алиасы если их еще нет
if ! grep -q "^API_ID=" .env; then
    echo "➕ Добавляю API_ID как алиас для TG_API_ID"
    echo "" >> .env
    echo "# Алиасы для совместимости" >> .env
    echo "API_ID=24120142" >> .env
fi

if ! grep -q "^API_HASH=" .env; then
    echo "➕ Добавляю API_HASH как алиас для TG_API_HASH"
    echo "API_HASH=5792c2ada7d1f4d1d3f91938a5caa7a7" >> .env
fi

echo "✅ Алиасы добавлены. Проверяем..."
echo ""

# Проверяем что все переменные теперь есть
node test_env_loading.js


