# ContentBot Architecture

## 🏗️ Обзор архитектуры

ContentBot - автоматизированная система управления Telegram каналами с ИИ-обработкой контента.

**Основной поток:**
1. **Глобальный поиск** → 2. **Парсинг** → 3. **LLM-обработка** → 4. **Публикация**

## 📁 Структура компонентов

### Core (Ядро системы)
- `core/contentbot-main.js` - главный бот, инициализация всех модулей
- `core/channel-manager.js` - управление каналами, публикация постов
- `core/database.js` - база данных SQLite, схемы таблиц

### Parsers (Парсинг контента)
- `parsers/content-parser.js` - парсер Telegram каналов через MTProto
- Использует `telegram_parser` (симлинк на `/root/tgparser`)

### LLM (ИИ-обработка)
- `llm/llm-rewriter.js` - переписывание, генерация, улучшение контента
- Интеграция с OpenRouter через `OpenRouterManager`

### Scripts (Скрипты и утилиты)
- `scripts/build_topic_catalog_improved.js` - построение каталога 46 тематик
- `scripts/global_search_post.js` - глобальный поиск + генерация постов
- `scripts/ai_battle_post.js` - AI-батлы между моделями
- `scripts/architecture_post.js` - тестирование архитектуры
- `scripts/collect_battle_sources.js` - сбор источников для батлов

### Data (Данные и конфигурация)
- `data/topic_channels_catalog_improved.json` - каталог 46 тематик с каналами
- `data/topic_synonyms.json` - синонимы для улучшения поиска
- `data/last_battle_sources.json` - источники для AI-батлов

### Docs (Документация)
- `docs/LLM_MODEL_EVAL.md` - оценка LLM-моделей
- `docs/TOPIC_CATALOG_IMPROVED.md` - каталог тематик
- `docs/SCRIPTS_GUIDE.md` - руководство по скриптам

### Config (Конфигурация)
- `ecosystem.config.js` - конфигурация PM2
- `env/ContentBot.txt` - переменные окружения

## 🔄 Поток данных

### 1. Инициализация
```javascript
// contentbot-main.js
await this.db.init();           // База данных
await this.parser.init();       // MTProto клиент
await this.channelManager.init(this.parser.client); // Передача клиента
await this.bot.start();         // Telegram бот
```

### 2. Глобальный поиск каналов
```javascript
// build_topic_catalog_improved.js
const channels = await client.invoke(new Api.contacts.Search({
  q: searchQuery,
  limit: 100
}));
const filtered = channels.chats.filter(c => c.participantsCount >= 50);
```

### 3. Парсинг и синтез контента
```javascript
// global_search_post.js
const sources = await fetchChannelContent(channels, 2);
const prompt = synthesizeContent(sources, topic);
```

### 4. LLM-обработка
```javascript
// llm-rewriter.js
const response = await this.ai.makeRequest(prompt, {
  modelOverride: 'qwen/qwen3-235b-a22b-2507',
  max_tokens: 10000
});
```

### 5. Публикация
```javascript
// channel-manager.js
await bot.api.sendMessage(channelId, formattedPost);
```

## 🤖 LLM Layer (OpenRouter)

### Провайдер
- **OpenRouter** - основной провайдер
- **Cloud.ru** - отключен
- **Fallback** - локальная обработка текста

### API Ключи
- `OPENROUTER_API_KEY_PAID` - единственный активный ключ
- Ротация ключей отключена для стабильности

### Текущая маршрутизация моделей

| Задача | Модель | Токены | Описание |
|--------|--------|--------|----------|
| **Основная генерация** | `qwen/qwen3-235b-a22b-2507` | 10000 | PRIMARY модель |
| **Fallback** | `deepseek/deepseek-r1-0528-qwen3-8b:free` | 10000 | FALLBACK модель |
| **AI-батлы** | Все топовые модели | 10000 | Сравнение качества |

### Оптимизация токенов
- `max_tokens: 10000` - полные ответы для качества
- `temperature: 0.7` - баланс креативности
- Премиум модели для максимального качества

## 🗄️ База данных

### Таблицы
- `users` - пользователи бота
- `channels` - каналы пользователей
- `posts` - опубликованные посты
- `payments` - история платежей
- `content_sources` - источники контента

### Схема
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  username TEXT,
  subscription_status TEXT,
  created_at DATETIME
);
```

## 🔧 Переменные окружения

### Обязательные
```env
# Telegram
BOT_TOKEN=8312811183:AAEIHiM-KbdLNylg_tsqUPfn2h41yL7DH60
TG_API_ID=24120142
TG_API_HASH=5792c2ada7d1f4d1d3f91938a5caa7a7
SESSION_FILE=/root/tgparser/.session.txt

# OpenRouter
OPENROUTER_API_KEY_PAID=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

# ContentBot
MONTHLY_PRICE=3000
CHANNEL_SETUP_PRICE=10000
PREMIUM_PRICE=15000
OWNER_ID=123456789
```

### Дополнительные
```env
# Дополнительные OpenRouter ключи
OPENROUTER_API_KEY1=sk-or-v1-...
OPENROUTER_API_KEY2=sk-or-v1-...
# ... до OPENROUTER_API_KEY13
```

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
      BOT_TOKEN: '8312811183:AAEIHiM-KbdLNylg_tsqUPfn2h41yL7DH60',
      TG_API_ID: '24120142',
      TG_API_HASH: '5792c2ada7d1f4d1d3f91938a5caa7a7',
      SESSION_FILE: '/root/tgparser/.session.txt'
    }
  }]
};
```

### Команды PM2
```bash
pm2 start ecosystem.config.js
pm2 restart contentbot --update-env
pm2 logs contentbot
pm2 status
```

## 🎨 Стили написания

### Доступные стили
- **мотивация** 🔥 - вдохновляющий и энергичный
- **бизнес** 💼 - профессиональный и практичный
- **технологии** 🤖 - современный и информативный
- **психология** 🧠 - понимающий и поддерживающий
- **универсальный** ✨ - дружелюбный и познавательный

### Обработка контента
1. **Переписывание** - уникализация текста
2. **Эмодзи** - добавление по стилю
3. **CTA** - призыв к действию
4. **Форматирование** - структурирование

## 🔐 Безопасность

### Токены
- Все токены в переменных окружения
- Маскирование в логах
- Ротация OpenRouter ключей

### Ограничения
- Лимиты Telegram API
- Анти-спам защита
- Логирование операций

## 📊 Мониторинг

### Логи
- `logs/contentbot-error.log` - ошибки
- `logs/contentbot-out.log` - вывод
- `logs/contentbot-combined.log` - все логи

### Метрики
- Количество постов
- Вовлеченность
- Использование LLM
- Статистика платежей

## 🧪 Тестирование

### Быстрый тест LLM
```bash
cd /root/contentbot
node -e "
const { LLMRewriter } = require('./llm/llm-rewriter');
(async()=>{
  const llm = new LLMRewriter();
  const gen = await llm.generateFromScratch('мотивация к учебе','мотивация');
  console.log('GEN:', (gen&&gen.text||'').slice(0,120));
  const rw = await llm.rewriteContent({text:'Успех приходит к тем, кто каждый день делает маленький шаг вперед.'},'универсальный');
  console.log('RW:', (rw&&rw.text||'').slice(0,120));
})().catch(console.error);
"
```

### Проверка статуса
```bash
pm2 status
pm2 logs contentbot --lines 50
```

## 🔄 Интеграции

### Telegram Parser
- Симлинк: `/root/contentbot/telegram_parser` → `/root/tgparser`
- MTProto клиент для парсинга
- Сессия: `/root/tgparser/.session.txt`

### OpenRouter
- Премиум модели: Qwen3-235B-A22B, DeepSeek R1-0528
- Платный ключ для стабильной работы
- Fallback на локальную обработку

### Каталог тематик
- 46 тематик с найденными каналами
- Улучшенный алгоритм поиска с синонимами
- Точные данные участников через GetFullChannel

## 📈 Производительность

### Оптимизации
- Полные LLM ответы (10000 токенов) для качества
- Кэширование результатов
- Асинхронная обработка
- Стабильный API ключ

### Масштабирование
- PM2 кластер режим
- База данных SQLite
- Логирование в файлы
- Мониторинг ресурсов

---

**ContentBot Architecture** - полная автоматизация Telegram каналов с ИИ! 🚀

