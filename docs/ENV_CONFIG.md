# Конфигурация переменных окружения ContentBot

**Версия:** 1.0  
**Дата:** 16.10.2025  
**Файл:** `/root/env/ContentBot.txt`

## 📋 Обзор

ContentBot использует переменные окружения для хранения конфигурации, API ключей и настроек. Все переменные загружаются из файла `/root/env/ContentBot.txt` и передаются в приложение через PM2.

## 🔧 Обязательные переменные

### Telegram Bot API
```env
BOT_TOKEN=your_bot_token_here
```
- **Назначение**: Токен основного Telegram бота
- **Получение**: @BotFather в Telegram
- **Использование**: Публикация постов, команды бота

### Telegram MTProto API
```env
TG_API_ID=your_api_id_here
TG_API_HASH=your_api_hash_here
```
- **Назначение**: API ключи для MTProto клиента
- **Получение**: https://my.telegram.org/apps
- **Использование**: Парсинг каналов, глобальный поиск

### Сессия MTProto
```env
SESSION_FILE=/root/tgparser/.session.txt
```
- **Назначение**: Путь к файлу сессии MTProto
- **Автогенерация**: При первом запуске
- **Использование**: Аутентификация в Telegram

## 🤖 OpenRouter API

### Основной ключ (обязательный)
```env
OPENROUTER_API_KEY_PAID=your_openrouter_api_key_here
```
- **Назначение**: Платный ключ OpenRouter для стабильной работы
- **Получение**: https://openrouter.ai/keys
- **Использование**: Все LLM запросы
- **Статус**: Единственный активный ключ

### Дополнительные ключи (неактивные)
```env
OPENROUTER_API_KEY1=your_openrouter_api_key_here
OPENROUTER_API_KEY2=your_openrouter_api_key_here
# ... до OPENROUTER_API_KEY13
```
- **Назначение**: Резервные ключи (отключены)
- **Статус**: Не используются в текущей конфигурации
- **Причина**: Стабильность работы с одним ключом

## 💰 Монетизация

### Цены
```env
MONTHLY_PRICE=3000
CHANNEL_SETUP_PRICE=10000
PREMIUM_PRICE=15000
```
- **MONTHLY_PRICE**: Стоимость месячной подписки (₽)
- **CHANNEL_SETUP_PRICE**: Стоимость настройки канала (₽)
- **PREMIUM_PRICE**: Стоимость премиум подписки (₽)

### Владелец системы
```env
OWNER_ID=123456789
```
- **Назначение**: Telegram ID владельца системы
- **Использование**: Админ права, уведомления

## 🚀 PM2 Конфигурация

### ecosystem.config.js
```javascript
module.exports = {
  apps: [{
    name: 'contentbot',
    script: 'npm',
    args: 'start',
    cwd: '/root/contentbot',
    env: {
      NODE_ENV: 'production',
      BOT_TOKEN: 'your_bot_token_here',
      TG_API_ID: 'your_api_id_here',
      TG_API_HASH: 'your_api_hash_here',
      SESSION_FILE: '/root/tgparser/.session.txt'
    }
  }]
};
```

### Загрузка переменных
PM2 автоматически загружает переменные из `ecosystem.config.js`. Для обновления переменных:

```bash
# Перезапуск с обновлением env
pm2 restart contentbot --update-env

# Проверка переменных
pm2 show contentbot
```

## 📁 Структура файлов

### Основной файл конфигурации
```
/root/env/ContentBot.txt
```

### Содержимое файла
```env
# Telegram Bot API
BOT_TOKEN=your_bot_token_here

# Telegram MTProto API
TG_API_ID=your_api_id_here
TG_API_HASH=your_api_hash_here
SESSION_FILE=/root/tgparser/.session.txt

# OpenRouter API
OPENROUTER_API_KEY_PAID=your_openrouter_api_key_here

# Дополнительные ключи (неактивные)
OPENROUTER_API_KEY1=your_openrouter_api_key_here
OPENROUTER_API_KEY2=your_openrouter_api_key_here
# ... до OPENROUTER_API_KEY13

# Монетизация
MONTHLY_PRICE=3000
CHANNEL_SETUP_PRICE=10000
PREMIUM_PRICE=15000
OWNER_ID=123456789
```

## 🔐 Безопасность

### Защита ключей
- **Файл конфигурации**: Доступ только для root
- **Права доступа**: 600 (только владелец)
- **Логирование**: Маскирование ключей в логах
- **Резервное копирование**: Шифрование бэкапов

### Проверка безопасности
```bash
# Проверка прав доступа
ls -la /root/env/ContentBot.txt

# Проверка переменных в PM2
pm2 show contentbot | grep -E "(BOT_TOKEN|TG_API|OPENROUTER)"
```

## 🛠️ Управление конфигурацией

### Обновление переменных
1. **Редактирование файла**:
   ```bash
   nano /root/env/ContentBot.txt
   ```

2. **Перезапуск PM2**:
   ```bash
   pm2 restart contentbot --update-env
   ```

3. **Проверка**:
   ```bash
   pm2 logs contentbot --lines 10
   ```

### Добавление новых переменных
1. Добавить в `/root/env/ContentBot.txt`
2. Добавить в `ecosystem.config.js`
3. Перезапустить PM2

### Удаление переменных
1. Удалить из файла конфигурации
2. Удалить из `ecosystem.config.js`
3. Перезапустить PM2

## 🧪 Тестирование конфигурации

### Проверка Telegram Bot
```bash
cd /root/contentbot
node -e "
const { Bot } = require('grammy');
const bot = new Bot(process.env.BOT_TOKEN);
bot.api.getMe().then(console.log).catch(console.error);
"
```

### Проверка MTProto
```bash
cd /root/contentbot
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
node -e "
const { TelegramApi } = require('./telegram_parser');
const api = new TelegramApi();
api.init().then(() => console.log('MTProto OK')).catch(console.error);
"
```

### Проверка OpenRouter
```bash
cd /root/contentbot
node -e "
const { OpenRouterManager } = require('./telegram_parser/dist/ai/openrouter-manager');
const ai = new OpenRouterManager();
ai.makeRequest('Тест', { max_tokens: 10 }).then(r => console.log('OpenRouter OK')).catch(console.error);
"
```

## ⚠️ Важные замечания

### Не изменяйте вручную
- **Файл конфигурации** редактируется только через скрипты
- **PM2 переменные** синхронизируются автоматически
- **Сессия MTProto** генерируется автоматически

### Резервное копирование
```bash
# Создание бэкапа
cp /root/env/ContentBot.txt /root/env/ContentBot.txt.backup

# Восстановление
cp /root/env/ContentBot.txt.backup /root/env/ContentBot.txt
pm2 restart contentbot --update-env
```

### Мониторинг
- **Логи PM2**: `pm2 logs contentbot`
- **Статус**: `pm2 status`
- **Переменные**: `pm2 show contentbot`

---

**Конфигурация ContentBot** - безопасное управление переменными окружения! 🔐

*Документ обновляется при изменении конфигурации системы.*

