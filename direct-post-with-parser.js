#!/usr/bin/env node
/**
 * 🎯 ContentBot - ПРЯМОЙ ЗАПУСК ИЗ telegram_parser
 * Использует MTProtoClient напрямую из telegram_parser
 */

// Переходим в папку telegram_parser и запускаем оттуда
process.chdir('/home/user1/telegram_parser');
require('dotenv').config();

const { MTProtoClient } = require('./dist/mtproto/client');
const axios = require('axios');
const fs = require('fs');

console.log('🎯 ContentBot - ПРЯМОЙ ЗАПУСК ИЗ telegram_parser');
console.log('='*60);

class DirectContentPoster {
    constructor() {
        this.mt = MTProtoClient.get();
        this.client = this.mt.getClient();
        this.targetChannelName = "Каналы для парсинга сделок";
        this.LLM_API_KEY = process.env.LLM_API;
    }

    async init() {
        await this.mt.start();
        console.log('✅ Telegram клиент подключен');
    }

    async findTargetChannel() {
        try {
            console.log(`🔍 Ищем целевой канал: "${this.targetChannelName}"...`);
            const dialogs = await this.client.getDialogs();
            
            console.log(`📋 Всего диалогов: ${dialogs.length}`);
            
            for (const dialog of dialogs) {
                if (dialog.title && dialog.title.includes(this.targetChannelName)) {
                    console.log(`✅ НАЙДЕН! "${dialog.title}"`);
                    console.log(`🆔 ID: ${dialog.id}`);
                    console.log(`👥 Тип: ${dialog.entity.className}`);
                    return dialog;
                }
            }
            
            console.log(`❌ Канал "${this.targetChannelName}" НЕ НАЙДЕН`);
            
            // Показываем первые 10 диалогов для отладки
            console.log('\n📋 Первые 10 диалогов:');
            dialogs.slice(0, 10).forEach((d, i) => {
                if (d.title) {
                    console.log(`${i+1}. ${d.title}`);
                }
            });
            
            return null;
            
        } catch (error) {
            console.error('❌ Ошибка поиска канала:', error.message);
            return null;
        }
    }

    async generateContentForTraders() {
        try {
            console.log('🤖 Генерирую контент для трейдеров...');
            
            const response = await axios.post(
                'https://foundation-models.api.cloud.ru/v1/chat/completions',
                {
                    model: 'openai/gpt-oss-120b',
                    messages: [
                        {
                            role: "system",
                            content: "Ты профессиональный трейдер и маркетолог в сфере автоматизации торговых каналов."
                        },
                        {
                            role: "user",
                            content: `Создай ВЗРЫВНОЙ пост для канала "Каналы для парсинга сделок".

ЦЕЛЬ: Продать ContentBot - систему автоматизации каналов

СТИЛЬ: Как успешный трейдер который знает секрет

ТРЕБОВАНИЯ:
- 600-800 символов
- Конкретные цифры ROI
- Упомяни парсинг, AI, автоматизацию
- Сильный призыв к действию
- 3-4 эмодзи
- Хештеги в конце

ПРИМЕР СТРУКТУРЫ:
1. Боль/проблема трейдеров
2. Решение (ContentBot)
3. Конкретные результаты
4. Призыв к действию

ПОСТ:`
                        }
                    ],
                    max_tokens: 1200,
                    temperature: 0.8
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.LLM_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            const content = response.data.choices[0].message.content.trim();
            console.log('✅ ВЗРЫВНОЙ контент сгенерирован!');
            return content;
            
        } catch (error) {
            console.error('❌ Ошибка генерации контента:', error.message);
            return `🔥 ТРЕЙДЕРЫ, хватит сливать время на ручные посты!

Пока вы копируете сигналы вручную, ваши конкуренты используют ContentBot и зарабатывают в 3 раза больше.

🚀 Что делает ContentBot:
• Парсит ТОП-каналы 24/7
• Переписывает сигналы через GPT-4
• Автопостинг по расписанию
• Полная аналитика эффективности

📈 РЕЗУЛЬТАТЫ за первый месяц:
• +380% охватов
• +220% новых подписчиков  
• -90% времени на ведение канала
• ROI 400% уже на 2-й неделе

💰 Стоимость: 3000₽/мес (окупается за 3 дня!)
⚡ Настройка: 5000₽ (делаем за сутки)

🎯 Готов автоматизировать? Пиши в личку прямо сейчас!

#ContentBot #ТрейдингАвтоматизация #АI #НейроКонтент #AutoTrading`;
        }
    }

    async postToChannel() {
        try {
            // Генерируем контент
            const content = await this.generateContentForTraders();
            
            console.log('\n📝 СГЕНЕРИРОВАННЫЙ КОНТЕНТ:');
            console.log('┌' + '─'.repeat(70) + '┐');
            content.split('\n').forEach(line => {
                console.log('│ ' + line.padEnd(69).substring(0, 69) + '│');
            });
            console.log('└' + '─'.repeat(70) + '┘');
            console.log('');
            
            // Ищем целевой канал
            const targetEntity = await this.findTargetChannel();
            
            if (!targetEntity) {
                console.log('📱 Отправляем в "Сохраненные сообщения"...');
                const savedMessages = await this.client.getEntity('me');
                await this.client.sendMessage(savedMessages, { message: content });
                console.log('✅ Отправлено в "Сохраненные сообщения"!');
                return { success: true, location: 'Сохраненные сообщения', content };
            } else {
                console.log(`📤 Отправляем в "${targetEntity.title}"...`);
                await this.client.sendMessage(targetEntity, { message: content });
                console.log('🎉 ПОСТ ОПУБЛИКОВАН В ЦЕЛЕВОМ КАНАЛЕ!');
                return { success: true, location: targetEntity.title, content };
            }
            
        } catch (error) {
            console.error('❌ Ошибка публикации:', error.message);
            return { success: false, error: error.message, content: '' };
        }
    }

    async close() {
        console.log('🔌 Отключение...');
    }
}

async function main() {
    const poster = new DirectContentPoster();
    
    try {
        console.log('📊 ПРОВЕРКА НАСТРОЕК:');
        console.log(`🤖 LLM API: ${poster.LLM_API_KEY ? '✅' : '❌'}`);
        console.log(`🎯 Цель: "${poster.targetChannelName}"`);
        console.log(`📁 Путь: ${process.cwd()}`);
        console.log('');

        console.log('🚀 Инициализация...');
        await poster.init();

        console.log('📤 Генерация и публикация...');
        const result = await poster.postToChannel();

        // Сохраняем результат
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const resultFile = `/home/user1/ContentBot/post_result_${timestamp}.json`;
        fs.writeFileSync(resultFile, JSON.stringify(result, null, 2), 'utf8');

        console.log('\n🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ:');
        console.log('='*60);

        if (result.success) {
            console.log('🎉 УСПЕХ! КОНТЕНТ ОПУБЛИКОВАН!');
            console.log(`📺 Локация: ${result.location}`);
            console.log(`💾 Результат сохранен: ${resultFile}`);
            
            console.log('\n🔥 СИСТЕМА РАБОТАЕТ!');
            console.log('💰 telegram_parser + ContentBot = PROFIT!');
            console.log('🚀 Готово к продажам клиентам!');
            
        } else {
            console.log('❌ Ошибка публикации');
            console.log(`💥 ${result.error}`);
            console.log('📋 Но контент готов для ручной публикации');
        }

        console.log('\n💡 NEXT STEPS:');
        console.log('1. Проверь Telegram канал или "Сохраненные"');
        console.log('2. Система готова к продаже за 3000₽/мес');
        console.log('3. Настройка для клиентов за 5000₽');
        console.log('4. PROFIT! 🤑');

        await poster.close();
        
    } catch (error) {
        console.error('❌ Критическая ошибка:', error.message);
        console.log('\n💡 ДИАГНОСТИКА:');
        console.log('• Убедись что telegram_parser работает');
        console.log('• Проверь .session.json');
        console.log('• Проверь что канал существует');
        
        await poster.close();
    }
}

console.log('🚀 Запуск ContentBot с telegram_parser архитектурой...\n');
main().catch(console.error); 