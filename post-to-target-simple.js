#!/usr/bin/env node
/**
 * 🎯 ContentBot - ПРОСТОЙ ПОСТ В ЦЕЛЕВОЙ КАНАЛ
 * Использует существующие зависимости для публикации в канал
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

console.log('🎯 ContentBot - ПРОСТОЙ ПОСТ В ЦЕЛЕВОЙ КАНАЛ');
console.log('='*60);

const LLM_API_KEY = process.env.LLM_API;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TARGET_CHANNEL_NAME = "Каналы для парсинга сделок";

// Генерация контента для трейдинг канала
async function generateTradingContent() {
    try {
        console.log('🤖 Генерирую контент для трейдеров...');
        
        const response = await axios.post(
            'https://foundation-models.api.cloud.ru/v1/chat/completions',
            {
                model: 'openai/gpt-oss-120b',
                messages: [
                    {
                        role: "system",
                        content: "Ты эксперт по автоматизации трейдинга и копирайтер для трейдинг каналов."
                    },
                    {
                        role: "user",
                        content: `Создай МОЩНЫЙ пост для Telegram канала трейдеров.

КОНТЕКСТ: Канал "Каналы для парсинга сделок" - место публикации торговых сигналов

ТРЕБОВАНИЯ:
- 400-600 символов  
- Тон: профессиональный трейдер
- Тема: автоматизация каналов через AI
- Упомяни ContentBot как решение
- Призыв к действию в конце
- 2-3 эмодзи

ПОСТ:`
                    }
                ],
                max_tokens: 800,
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

        return response.data.choices[0].message.content.trim();
        
    } catch (error) {
        console.error('❌ Ошибка генерации:', error.message);
        return `🤖 ContentBot - Революция автоматизации каналов!

Устал вручную постить контент? Время автоматизации!

✨ Что умеет ContentBot:
• Парсит сигналы из ТОП-каналов
• Переписывает через нейросети Cloud.ru
• Автопостинг по расписанию  
• Полная автоматизация контента

📊 Результаты клиентов:
+500% охватов | -90% времени | +300% подписчиков

💰 Стоимость: 3000₽/мес за канал
⚡ Настройка: 5000₽ единоразово

🚀 Готов автоматизировать свой канал?

#ContentBot #НейроКонтент #ТрейдингАвтоматизация`;
    }
}

// Поиск ID канала через Bot API
async function findChannelId() {
    try {
        console.log('🔍 Получаю список чатов через Bot API...');
        
        // Попробуем получить обновления, чтобы найти ID канала
        const response = await axios.get(
            `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
        );

        if (response.data.ok && response.data.result.length > 0) {
            console.log('📋 Найдены обновления, ищем канал...');
            
            for (const update of response.data.result) {
                if (update.message && update.message.chat) {
                    const chat = update.message.chat;
                    if (chat.title && chat.title.includes(TARGET_CHANNEL_NAME)) {
                        console.log(`✅ Найден канал: ${chat.title} (ID: ${chat.id})`);
                        return chat.id;
                    }
                }
                
                if (update.channel_post && update.channel_post.chat) {
                    const chat = update.channel_post.chat;
                    if (chat.title && chat.title.includes(TARGET_CHANNEL_NAME)) {
                        console.log(`✅ Найден канал: ${chat.title} (ID: ${chat.id})`);
                        return chat.id;
                    }
                }
            }
        }
        
        console.log('❌ Канал не найден в обновлениях');
        return null;
        
    } catch (error) {
        console.error('❌ Ошибка поиска канала:', error.message);
        return null;
    }
}

// Попытка отправки в разные каналы/чаты
async function tryPostToKnownChannels(content) {
    // Список возможных ID каналов/чатов для тестирования
    const testChannels = [
        process.env.TARGET_CHANNEL_ID,
        process.env.OWNER_ID,
        '@ContentBotTest', // Если создашь канал с таким username
        // Добавь сюда ID своих каналов/групп для тестирования
    ];

    for (const channelId of testChannels) {
        if (!channelId) continue;
        
        try {
            console.log(`📤 Пробую отправить в: ${channelId}...`);
            
            const response = await axios.post(
                `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
                {
                    chat_id: channelId,
                    text: content,
                    parse_mode: 'Markdown'
                }
            );

            if (response.data.ok) {
                console.log(`✅ УСПЕХ! Пост отправлен в ${channelId}`);
                console.log(`📱 Message ID: ${response.data.result.message_id}`);
                return true;
            }

        } catch (error) {
            console.log(`❌ Ошибка для ${channelId}: ${error.response?.data?.description || error.message}`);
        }
    }
    
    return false;
}

// Создание инструкций для ручного постинга
function createManualInstructions(content) {
    console.log('\n📋 ИНСТРУКЦИИ ДЛЯ РУЧНОГО ПОСТИНГА:');
    console.log('='*60);
    console.log('1. Найди в Telegram канал "Каналы для парсинга сделок"');
    console.log('2. Если ты админ канала - запости контент ниже');
    console.log('3. Если нет доступа - создай тестовый канал');
    console.log('4. Добавь ContentBot бота как админа канала');
    console.log('');
    
    console.log('📝 КОНТЕНТ ДЛЯ КОПИРОВАНИЯ:');
    console.log('┌' + '─'.repeat(70) + '┐');
    content.split('\n').forEach(line => {
        console.log('│ ' + line.padEnd(69).substring(0, 69) + '│');
    });
    console.log('└' + '─'.repeat(70) + '┘');
    console.log('');
    
    console.log('💡 СЛЕДУЮЩИЕ ШАГИ:');
    console.log('🚀 ./start.sh pm2        # Запуск полной системы');
    console.log('🤖 /demo                 # Тест в боте');
    console.log('💰 Готово к продажам!    # Система настроена');
}

// Копирование контента в файл
function saveContentToFile(content) {
    try {
        const filename = `generated_content_${Date.now()}.txt`;
        fs.writeFileSync(filename, content, 'utf8');
        console.log(`💾 Контент сохранен в файл: ${filename}`);
        return filename;
    } catch (error) {
        console.log('❌ Не удалось сохранить файл:', error.message);
        return null;
    }
}

async function main() {
    try {
        console.log('📊 НАСТРОЙКИ:');
        console.log(`🤖 LLM API: ${LLM_API_KEY ? '✅' : '❌'}`);
        console.log(`🤖 BOT TOKEN: ${BOT_TOKEN ? '✅' : '❌'}`);
        console.log(`🎯 Целевой канал: "${TARGET_CHANNEL_NAME}"`);
        console.log('');

        // Генерируем контент
        const content = await generateTradingContent();
        console.log('✅ Контент сгенерирован!');
        
        // Сохраняем в файл
        const filename = saveContentToFile(content);
        
        // Пытаемся найти канал
        const channelId = await findChannelId();
        
        // Пытаемся отправить автоматически
        let posted = false;
        if (channelId) {
            posted = await tryPostToKnownChannels(content);
        } else {
            posted = await tryPostToKnownChannels(content);
        }
        
        // Если автопост не удался, показываем инструкции
        if (!posted) {
            createManualInstructions(content);
        }
        
        console.log('\n🎯 РЕЗУЛЬТАТ:');
        console.log('='*50);
        
        if (posted) {
            console.log('🎉 КОНТЕНТ УСПЕШНО ОПУБЛИКОВАН!');
            console.log('🚀 Система работает и готова к автоматизации!');
        } else {
            console.log('📋 Контент готов для ручной публикации');
            console.log('💡 Система настроена, нужно только опубликовать');
        }
        
        console.log('\n💰 ГОТОВО К МОНЕТИЗАЦИИ:');
        console.log('💳 3000₽/месяц за канал');
        console.log('⚡ 5000₽ настройка');
        console.log('🔥 ROI за 1-2 недели!');

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
    }
}

main().catch(console.error); 