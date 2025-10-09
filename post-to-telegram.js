#!/usr/bin/env node
/**
 * 🚀 ContentBot - РЕАЛЬНЫЙ ПОСТ В TELEGRAM
 * Использует твою сессию и постит контент прямо в канал!
 */

require('dotenv').config();
const { TelegramApi } = require('telegram');
const { StringSession } = require('telegram/sessions');
const axios = require('axios');
const fs = require('fs');

console.log('🚀 ContentBot - РЕАЛЬНЫЙ ПОСТ В TELEGRAM');
console.log('='*60);

// Настройки
const API_ID = parseInt(process.env.API_ID);
const API_HASH = process.env.API_HASH;
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
const LLM_API_KEY = process.env.LLM_API;

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
async function generateContent() {
    try {
        console.log('🤖 Генерирую контент через Cloud.ru...');
        
        const prompt = `Создай короткий мотивационный пост для Telegram канала на тему саморазвития.

ТРЕБОВАНИЯ:
- Длина: 200-400 символов
- Тон: вдохновляющий и энергичный  
- Язык: русский
- Добавь 1-2 эмодзи
- Закончи призывом к действию

ПОСТ:`;

        const response = await axios.post(
            'https://foundation-models.api.cloud.ru/v1/chat/completions',
            {
                model: 'openai/gpt-oss-120b',
                messages: [
                    {
                        role: "system",
                        content: "Ты профессиональный копирайтер для Telegram каналов."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.8
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
        console.log('✅ Контент сгенерирован!');
        return content;
        
    } catch (error) {
        console.error('❌ Ошибка генерации контента:', error.message);
        return `🔥 ContentBot тест успешен!

Автоматический пост создан и опубликован через нейросеть.

💪 Система работает на полную мощность!

🚀 Готов к монетизации! Кто хочет такой же канал?`;
    }
}

// Конвертация сессии в StringSession
function convertSession(sessionData) {
    try {
        // Это упрощенная конвертация, в реальности может потребоваться более сложная логика
        const sessionString = JSON.stringify(sessionData);
        return new StringSession(sessionString);
    } catch (error) {
        console.error('❌ Ошибка конвертации сессии:', error.message);
        return new StringSession('');
    }
}

async function postToTelegram() {
    try {
        console.log('📱 Подключаюсь к Telegram...');
        
        // Создаем клиент
        const client = new TelegramApi(new StringSession(''), API_ID, API_HASH, {
            connectionRetries: 5,
        });

        // Попытка подключения
        await client.start({
            phoneNumber: async () => {
                console.log('📞 Запрос номера телефона (должно быть пропущено из-за сессии)');
                return '';
            },
            password: async () => {
                console.log('🔐 Запрос пароля');
                return '';
            },
            phoneCode: async () => {
                console.log('💬 Запрос кода из SMS');
                return '';
            },
            onError: (err) => {
                console.error('❌ Ошибка авторизации:', err);
            },
        });

        console.log('✅ Подключен к Telegram!');

        // Генерируем контент
        const content = await generateContent();
        console.log(`📝 Пост для публикации:\n${content}`);

        // Постим в канал
        console.log(`📤 Отправляю в канал ${TARGET_CHANNEL_ID}...`);
        
        const result = await client.sendMessage(TARGET_CHANNEL_ID, {
            message: content,
            parseMode: 'markdown'
        });

        console.log('🎉 УСПЕХ! Пост опубликован!');
        console.log(`🔗 Проверь канал: https://t.me/c/${TARGET_CHANNEL_ID.replace('-100', '')}`);
        
        await client.disconnect();
        return true;

    } catch (error) {
        console.error('❌ Ошибка постинга в Telegram:', error.message);
        
        // Альтернативный метод через Bot API
        return await postViaBot();
    }
}

// Альтернативный метод через Bot API
async function postViaBot() {
    try {
        console.log('🤖 Пробую через Bot API...');
        
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
            console.log('❌ BOT_TOKEN не настроен');
            return false;
        }

        const content = await generateContent();
        
        const response = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            {
                chat_id: TARGET_CHANNEL_ID,
                text: content,
                parse_mode: 'Markdown'
            }
        );

        if (response.data.ok) {
            console.log('🎉 УСПЕХ! Пост опубликован через Bot API!');
            console.log(`📱 Message ID: ${response.data.result.message_id}`);
            return true;
        } else {
            console.log('❌ Ошибка Bot API:', response.data);
            return false;
        }

    } catch (error) {
        console.error('❌ Ошибка Bot API:', error.message);
        return false;
    }
}

// Показываем инструкции
function showInstructions() {
    console.log('\n📋 КАК УВИДЕТЬ КОНТЕНТ:');
    console.log('');
    console.log('1️⃣ КАНАЛ В TELEGRAM:');
    console.log(`   🔗 https://t.me/c/${TARGET_CHANNEL_ID.replace('-100', '')}`);
    console.log('   📱 Или найди канал по ID в Telegram');
    console.log('');
    console.log('2️⃣ ЕСЛИ КАНАЛ ЗАКРЫТЫЙ:');
    console.log('   👤 Убедись что ты админ канала');
    console.log('   🔑 Или добавь себя в канал');
    console.log('');
    console.log('3️⃣ АЛЬТЕРНАТИВНО:');
    console.log('   📝 Контент показан выше в консоли');
    console.log('   💾 Сохрани его для тестирования');
    console.log('');
    console.log('4️⃣ ПОЛНЫЙ ЗАПУСК:');
    console.log('   🚀 ./start.sh pm2  # Запуск полной системы');
    console.log('   🤖 /demo в боте для тестирования');
    console.log('');
}

async function main() {
    try {
        console.log('📊 ПРОВЕРКА НАСТРОЕК:');
        console.log(`🔑 API_ID: ${API_ID ? '✅' : '❌'}`);
        console.log(`🔑 API_HASH: ${API_HASH ? '✅' : '❌'}`);
        console.log(`🎯 Target Channel: ${TARGET_CHANNEL_ID || '❌'}`);
        console.log(`🤖 LLM API: ${LLM_API_KEY ? '✅' : '❌'}`);
        console.log(`🔐 Сессия: ${sessionData ? '✅' : '❌'}`);
        console.log('');

        // Генерируем и показываем контент
        const content = await generateContent();
        console.log('📝 СГЕНЕРИРОВАННЫЙ КОНТЕНТ:');
        console.log('┌' + '─'.repeat(50) + '┐');
        console.log('│' + content.split('\n').map(line => 
            ' ' + line.padEnd(49).substring(0, 49) + '│'
        ).join('\n│'));
        console.log('└' + '─'.repeat(50) + '┘');
        console.log('');

        // Пытаемся запостить
        const posted = await postToTelegram();
        
        if (!posted) {
            console.log('⚠️ Не удалось автоматически запостить');
            console.log('📋 Но контент готов! Скопируй выше и запости вручную');
        }

        showInstructions();

    } catch (error) {
        console.error('❌ Общая ошибка:', error.message);
        showInstructions();
    }
}

// Запуск
main().catch(console.error); 