#!/bin/bash

echo "🔍 Поиск API переменных в .env файле..."
echo ""

echo "📋 Переменные содержащие 'API':"
grep -i "api" .env || echo "  ❌ Не найдены"

echo ""
echo "📋 Переменные содержащие 'HASH':"
grep -i "hash" .env || echo "  ❌ Не найдены"

echo ""
echo "📋 Переменные содержащие 'ID':"
grep -i "id" .env || echo "  ❌ Не найдены"

echo ""
echo "📋 Все переменные в .env файле (первые 5 символов):"
while IFS='=' read -r key value; do
  if [[ $key && ! $key =~ ^[[:space:]]*# ]]; then
    value_preview=$(echo "$value" | head -c 5)
    echo "  $key = $value_preview..."
  fi
done < .env


