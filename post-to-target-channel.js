#!/usr/bin/env node
/**
 * 🎯 ContentBot - ПОСТ В ЦЕЛЕВОЙ КАНАЛ telegram_parser
 * Использует код из telegram_parser для поиска канала "Каналы для парсинга сделок"
 * И постит туда сгенерированный контент через Cloud.ru LLM
 */

require('dotenv').config();
const { MTProto } = require('@mtproto/core');
const { TelegramApi } = require('telegram');
const { StringSession } = require('telegram/sessions');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

console.log('🎯 ContentBot - ПОИСК И ПОСТ В ЦЕЛЕВОЙ КАНАЛ');
console.log('='*60);

// Настройки из ContentBot
const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const LLM_API_KEY = process.env.LLM_API;

// Настройки из telegram_parser
const TARGET_CHANNEL_NAME = "Каналы для парсинга сделок";

// Загружаем сессию
let sessionData = null;
try {
    sessionData = JSON.parse(fs.readFileSync('.session.json', 'utf8'));
    console.log('✅ Сессия загружена из файла');
} catch (error) {
    console.error('❌ Ошибка загрузки сессии:', error.message);
    process.exit(1);
}

// Cloud.ru API для генерации контента
async function generateContentForTrading() {
    try {
        console.log('🤖 Генерирую контент для трейдинг канала через Cloud.ru...');
        
        const prompt = `Создай МОЩНЫЙ пост для Telegram канала трейдеров на тему автоматизации торговли.

КОНТЕКСТ: Канал "Каналы для парсинга сделок" - это место где публикуются сигналы и анализ для трейдеров.

ТРЕБОВАНИЯ:
- Длина: 300-500 символов
- Тон: профессиональный и мотивирующий
- Тема: автоматизация трейдинга, AI-анализ, ContentBot
- Язык: русский
- Добавь 2-3 эмодзи по теме
- Упомяни что это от "ContentBot - Neuro Agency"
- Закончи призывом к действию

СТИЛЬ: как успешный трейдер который нашел секрет автоматизации

ПОСТ:`;

        const response = await axios.post(
            'https://foundation-models.api.cloud.ru/v1/chat/completions',
            {
                model: 'openai/gpt-oss-120b',
                messages: [
                    {
                        role: "system",
                        content: "Ты профессиональный копирайтер для трейдинг сообщества и эксперт по автоматизации торговли."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 700,
                temperature: 0.9
            },
            {
                headers: {
                    'Authorization': `Bearer ${LLM_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const content = response.data.choices[0].message.content.trim();
        console.log('✅ Контент для трейдеров сгенерирован!');
        return content;
        
    } catch (error) {
        console.error('❌ Ошибка генерации контента:', error.message);
        return `🤖 ContentBot - Neuro Agency

Революция в автоматизации каналов уже здесь!

✨ Что делаем:
• Парсим сигналы из ТОП каналов
• Переписываем через нейросети  
• Автопостинг по расписанию
• Полная автоматизация контента

💰 Результат: +500% охватов, -90% времени на ведение

🚀 Кто готов автоматизировать свой канал?

#ContentBot #НейроКонтент #ТрейдингАвтоматизация`;
    }
}

// Поиск целевого канала (код из telegram_parser)
async function findTargetChannel(client) {
    try {
        console.log(`🔍 Ищем канал: "${TARGET_CHANNEL_NAME}"...`);
        
        const dialogs = await client.getDialogs();
        console.log(`📋 Найдено диалогов: ${dialogs.length}`);
        
        for (const dialog of dialogs) {
            if (dialog.title && dialog.title.includes(TARGET_CHANNEL_NAME)) {
                console.log(`✅ Целевой канал найден!`);
                console.log(`📺 Название: ${dialog.title}`);
                console.log(`🆔 ID: ${dialog.id}`);
                console.log(`👥 Тип: ${dialog.entity.className}`);
                return dialog;
            }
        }
        
        console.log(`❌ Канал "${TARGET_CHANNEL_NAME}" не найден в диалогах`);
        
        // Выводим все доступные каналы для отладки
        console.log('\n📋 Доступные каналы/группы:');
        dialogs.slice(0, 20).forEach((dialog, index) => {
            if (dialog.title) {
                console.log(`${index + 1}. ${dialog.title} (ID: ${dialog.id})`);
            }
        });
        
        return null;
        
    } catch (error) {
        console.error('❌ Ошибка поиска канала:', error.message);
        return null;
    }
}

// Отправка сообщения в канал
async function postToTargetChannel() {
    let client = null;
    
    try {
        console.log('📱 Создаю Telegram клиент...');
        
        // Создаем клиент с сессией
        const sessionString = Buffer.from(JSON.stringify(sessionData)).toString('base64');
        const session = new StringSession(sessionString);
        
        client = new TelegramApi(session, API_ID, API_HASH, {
            connectionRetries: 5,
            useWSS: false
        });

        console.log('🔐 Подключаюсь к Telegram...');
        await client.start({
            phoneNumber: async () => {
                console.log('📞 Запрос номера (пропускаем благодаря сессии)');
                return '';
            },
            password: async () => '',
            phoneCode: async () => '',
            onError: (err) => console.error('❌ Ошибка авторизации:', err),
        });

        console.log('✅ Подключен к Telegram!');

        // Ищем целевой канал
        const targetChannel = await findTargetChannel(client);
        
        if (!targetChannel) {
            console.log('❌ Не удалось найти целевой канал');
            return false;
        }

        // Генерируем контент
        const content = await generateContentForTrading();
        
        console.log('\n📝 КОНТЕНТ ДЛЯ ПУБЛИКАЦИИ:');
        console.log('┌' + '─'.repeat(60) + '┐');
        content.split('\n').forEach(line => {
            console.log('│ ' + line.padEnd(59).substring(0, 59) + '│');
        });
        console.log('└' + '─'.repeat(60) + '┘');
        console.log('');

        // Постим в канал
        console.log(`📤 Отправляю в канал "${targetChannel.title}"...`);
        
        const result = await client.sendMessage(targetChannel.entity, {
            message: content,
            parseMode: 'markdown'
        });

        console.log('🎉 УСПЕХ! Пост опубликован в целевой канал!');
        console.log(`📱 Message ID: ${result.id}`);
        console.log(`🔗 Канал: ${targetChannel.title}`);
        
        return true;

    } catch (error) {
        console.error('❌ Ошибка постинга:', error.message);
        
        // Дополнительная диагностика
        if (error.message.includes('AUTH_KEY')) {
            console.log('💡 Проблема с авторизацией. Попробуй перезапустить telegram_parser');
        } else if (error.message.includes('CHAT_WRITE_FORBIDDEN')) {
            console.log('💡 Нет прав на запись в канал. Проверь права доступа');
        } else if (error.message.includes('PEER_ID_INVALID')) {
            console.log('💡 Неверный ID канала. Проверь что канал существует');
        }
        
        return false;
        
    } finally {
        if (client) {
            try {
                await client.disconnect();
                console.log('🔌 Отключен от Telegram');
            } catch (e) {
                console.log('⚠️ Ошибка отключения:', e.message);
            }
        }
    }
}

// Альтернативный метод - создание тестовой группы
async function createTestGroup() {
    console.log('\n🔧 ПЛАН Б: Создаю тестовую группу...');
    
    // Здесь можно добавить логику создания тестовой группы
    // Пока что просто показываем инструкции
    
    console.log('📋 РУЧНЫЕ ИНСТРУКЦИИ:');
    console.log('1. Создай группу в Telegram с названием "ContentBot Test"');
    console.log('2. Добавь туда бота или себя как админа');
    console.log('3. Скопируй контент выше и запости вручную');
    console.log('4. Это покажет как будет работать автопостинг');
}

// Показ результатов и инструкций
function showResults(posted) {
    console.log('\n📊 РЕЗУЛЬТАТЫ:');
    console.log('='*50);
    
    if (posted) {
        console.log('✅ КОНТЕНТ УСПЕШНО ОПУБЛИКОВАН!');
        console.log(`📺 Канал: "${TARGET_CHANNEL_NAME}"`);
        console.log('🎯 Система работает и готова к автоматизации!');
    } else {
        console.log('⚠️ Автопостинг не удался, но контент готов!');
        console.log('📋 Скопируй контент выше и запости вручную');
    }
    
    console.log('\n💡 ЧТО ДАЛЬШЕ:');
    console.log('🚀 Запусти полную систему: ./start.sh pm2');
    console.log('🤖 Используй команду /demo в боте ContentBot');
    console.log('💰 Система готова к монетизации!');
    console.log('📈 Настрой автопостинг по расписанию');
    
    console.log('\n🎯 МОНЕТИЗАЦИЯ:');
    console.log('💳 Стоимость: 3000₽/месяц за канал');
    console.log('⚡ Настройка: 5000₽ единоразово');
    console.log('🔥 ROI: Окупается за 1-2 недели!');
}

async function main() {
    try {
        console.log('📊 ПРОВЕРКА НАСТРОЕК:');
        console.log(`🔑 API_ID: ${API_ID ? '✅' : '❌'}`);
        console.log(`🔑 API_HASH: ${API_HASH ? '✅' : '❌'}`);
        console.log(`🤖 LLM API: ${LLM_API_KEY ? '✅' : '❌'}`);
        console.log(`🔐 Сессия: ${sessionData ? '✅' : '❌'}`);
        console.log(`🎯 Целевой канал: "${TARGET_CHANNEL_NAME}"`);
        console.log('');

        // Попытка постинга
        const posted = await postToTargetChannel();
        
        // Если не удалось, показываем альтернативы
        if (!posted) {
            await createTestGroup();
        }
        
        // Показываем результаты
        showResults(posted);

    } catch (error) {
        console.error('❌ Общая ошибка:', error.message);
        showResults(false);
    }
}

// Запуск
main().catch(console.error); 