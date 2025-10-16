# Руководство по скриптам ContentBot

**Версия:** 1.0  
**Дата:** 16.10.2025

## 📋 Обзор

ContentBot включает набор скриптов для различных задач: построение каталога тематик, глобальный поиск каналов, AI-батлы между моделями и тестирование архитектуры.

## 🏗️ Скрипты построения каталога

### `build_topic_catalog.js`
**Назначение:** Базовая версия построения каталога тематик

**Параметры запуска:**
```bash
cd /root/contentbot
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
node scripts/build_topic_catalog.js
```

**Что делает:**
- Читает `data/topic_catalog_config.json`
- Ищет каналы по каждой теме через `Api.contacts.Search`
- Фильтрует по минимуму 100 участников
- Сохраняет в `data/topic_channels_catalog.json`
- Генерирует `docs/TOPIC_CATALOG.md`

**Ограничения:**
- Простой поиск без синонимов
- Высокий порог участников (100)
- Нет точного подсчета участников

### `build_topic_catalog_improved.js` ⭐
**Назначение:** Улучшенная версия с расширенными возможностями

**Параметры запуска:**
```bash
cd /root/contentbot
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
node scripts/build_topic_catalog_improved.js
```

**Что делает:**
- Использует `data/topic_synonyms.json` для множественных запросов
- Увеличивает limit поиска до 100
- Снижает порог участников до 50
- Вызывает `channels.GetFullChannel` для точного подсчета
- Дедуплицирует каналы
- Сохраняет в `data/topic_channels_catalog_improved.json`
- Генерирует `docs/TOPIC_CATALOG_IMPROVED.md`

**Результаты:**
- 45 из 46 тем с найденными каналами
- 40 тем с ТОП-5 каналами
- Только 1 тема ("Патриотизм") без каналов

## 🔍 Скрипты поиска и генерации

### `global_search_post.js`
**Назначение:** Глобальный поиск каналов + генерация поста

**Параметры запуска:**
```bash
cd /root/contentbot
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
node scripts/global_search_post.js
```

**Что делает:**
- Ищет топ-3 канала по теме
- Парсит 2 поста с каждого канала
- Синтезирует контент в единый промпт
- Генерирует пост через LLM
- Публикует в канал через Bot API

**Функции:**
- `findTopChannels(topic, limit=3)` - поиск каналов
- `fetchChannelContent(channels, postsPerChannel=2)` - парсинг контента
- `synthesizeContent(sources, topic)` - синтез в промпт

### `architecture_post.js`
**Назначение:** Тестирование архитектуры на конкретной теме

**Параметры запуска:**
```bash
cd /root/contentbot
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
node scripts/architecture_post.js
```

**Что делает:**
- Тестирует полный pipeline на теме "software architecture"
- Использует `deepseek/deepseek-v3.1` модель
- Демонстрирует работу всех компонентов

## 🤖 AI-батлы и тестирование моделей

### `ai_battle_post.js`
**Назначение:** Сравнение моделей на одной теме

**Параметры запуска:**
```bash
cd /root/contentbot
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
node scripts/ai_battle_post.js
```

**Что делает:**
- Ищет каналы по теме "нейросети"
- Парсит контент и синтезирует промпт
- Отправляет промпт 4 моделям:
  - `deepseek/deepseek-r1-0528-qwen3-8b:free`
  - `mistralai/mistral-small-3.2-24b-instruct-2506`
  - `qwen/qwen-2.5-72b-instruct`
  - `switchpoint/router`
- Публикует результаты в канал

**Особенности:**
- Raw-режим (без обработки)
- 10000 токенов для полных ответов
- Сравнение качества моделей

### `ai_battle_from_json_raw.js`
**Назначение:** Батл на основе сохраненных источников

**Параметры запуска:**
```bash
cd /root/contentbot
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
node scripts/ai_battle_from_json_raw.js
```

**Что делает:**
- Загружает источники из `data/last_battle_sources.json`
- Синтезирует промпт
- Тестирует 4 премиум модели:
  - `deepseek/deepseek-r1-0528-qwen3-8b:free`
  - `anthropic/claude-3.5-sonnet-20241022`
  - `qwen/qwen3-235b-a22b-2507`
  - `google/gemini-2.0-flash-exp`
- Публикует raw-ответы

### `ai_switchpoint_raw_post.js`
**Назначение:** Тестирование Switchpoint Router с полными токенами

**Параметры запуска:**
```bash
cd /root/contentbot
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
node scripts/ai_switchpoint_raw_post.js
```

**Что делает:**
- Тестирует `switchpoint/router` с 10000 токенов
- Публикует raw-ответ для сравнения
- Исправляет проблему коротких ответов

## 📊 Утилиты

### `collect_battle_sources.js`
**Назначение:** Сбор источников для AI-батлов

**Параметры запуска:**
```bash
cd /root/contentbot
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
node scripts/collect_battle_sources.js
```

**Что делает:**
- Ищет каналы по теме "нейросети"
- Парсит контент
- Сохраняет в `data/last_battle_sources.json`
- Обеспечивает воспроизводимость батлов

## ⚙️ Конфигурация

### Переменные окружения
Все скрипты требуют:
```bash
export $(grep -E '^(TG_API_ID|TG_API_HASH)=' /root/env/ContentBot.txt | xargs)
export SESSION_FILE=/root/tgparser/.session.txt
```

### Файлы данных
- `data/topic_catalog_config.json` - список тем
- `data/topic_synonyms.json` - синонимы для поиска
- `data/topic_channels_catalog_improved.json` - результаты поиска
- `data/last_battle_sources.json` - источники для батлов

## 🚀 Примеры использования

### Построение каталога тем
```bash
# Базовая версия
node scripts/build_topic_catalog.js

# Улучшенная версия (рекомендуется)
node scripts/build_topic_catalog_improved.js
```

### Генерация поста
```bash
# Глобальный поиск + генерация
node scripts/global_search_post.js

# Тестирование архитектуры
node scripts/architecture_post.js
```

### AI-батлы
```bash
# Батл на новой теме
node scripts/ai_battle_post.js

# Батл на сохраненных источниках
node scripts/ai_battle_from_json_raw.js

# Тестирование Switchpoint
node scripts/ai_switchpoint_raw_post.js
```

## 📝 Логи и отладка

### Проверка статуса
```bash
# Логи PM2
pm2 logs contentbot

# Статус процессов
pm2 status
```

### Отладка скриптов
```bash
# Включить подробные логи
DEBUG=* node scripts/build_topic_catalog_improved.js

# Проверить переменные окружения
echo $TG_API_ID
echo $TG_API_HASH
echo $SESSION_FILE
```

## ⚠️ Важные замечания

### Ограничения Telegram API
- Не более 30 запросов в секунду
- Лимиты на поиск каналов
- Возможны временные блокировки

### Ограничения OpenRouter
- Стоимость токенов (10000 токенов дороже 220)
- Лимиты на премиум модели
- Возможны временные недоступности

### Рекомендации
1. **Используйте улучшенную версию** каталога
2. **Тестируйте на малых данных** перед массовым запуском
3. **Мониторьте логи** для выявления проблем
4. **Сохраняйте результаты** для воспроизводимости

---

**Все скрипты протестированы и готовы к использованию!** 🚀
