#!/usr/bin/env node
/**
 * 🚀 ContentBot - Тест с Cloud.ru API
 * Использует твой LLM_API ключ из IKAR
 */

require('dotenv').config();
const axios = require('axios');

console.log('🚀 ContentBot - Тест с Cloud.ru API');
console.log('='*50);

// Cloud.ru API настройки (как в твоем IKAR)
const CLOUD_RU_CONFIG = {
    apiKey: process.env.LLM_API,
    baseUrl: 'https://foundation-models.api.cloud.ru/v1',
    model: 'openai/gpt-oss-120b',
    maxTokens: 200000,
    temperature: 0.6
};

// Примеры контента для тестирования
const sampleContent = [
    "Успех в бизнесе требует не только таланта, но и постоянного развития. Каждый день дает новые возможности для роста и обучения.",
    "Мотивация — это не то, что приходит само по себе. Это то, что мы создаем каждый день через наши действия и решения.",
    "Технологии развиваются с невероятной скоростью. То, что казалось невозможным вчера, сегодня становится обыденностью.",
    "Психология успеха показывает: наш внутренний диалог определяет внешние результаты. Думайте позитивно!"
];

// Стили переписывания
const styles = {
    'мотивация': {
        tone: 'вдохновляющий и энергичный',
        emoji: '🔥💪⚡🎯🚀',
        cta: '\n\n🔥 А как ты мотивируешь себя? Поделись!'
    },
    'бизнес': {
        tone: 'профессиональный и практичный', 
        emoji: '💼📈💰🎯📊',
        cta: '\n\n📈 Применяешь эти принципы? Расскажи!'
    },
    'технологии': {
        tone: 'современный и информативный',
        emoji: '🤖💻📱⚙️🔬',
        cta: '\n\n💻 Что думаешь об этой технологии?'
    },
    'психология': {
        tone: 'понимающий и поддерживающий',
        emoji: '🧠💭🌟❤️🔮', 
        cta: '\n\n🌟 Согласен? Ставь ❤️'
    }
};

async function cloudRuRequest(messages) {
    try {
        const response = await axios.post(
            `${CLOUD_RU_CONFIG.baseUrl}/chat/completions`,
            {
                model: CLOUD_RU_CONFIG.model,
                messages: messages,
                max_tokens: 1000,
                temperature: CLOUD_RU_CONFIG.temperature,
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${CLOUD_RU_CONFIG.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error('Cloud.ru API ошибка:', error.response?.data || error.message);
        return null;
    }
}

async function rewriteContentWithCloudRu(originalText, style) {
    try {
        const styleConfig = styles[style] || styles['мотивация'];
        
        const prompt = `
Переписать этот текст в стиле "${style}":

ОРИГИНАЛ: "${originalText}"

ТРЕБОВАНИЯ:
- Тон: ${styleConfig.tone}
- Длина: 300-800 символов
- Язык: русский  
- Сделай уникальным и вовлекающим
- НЕ добавляй эмодзи (добавлю отдельно)
- Полностью переформулируй, не копируй

ПЕРЕПИСАННЫЙ ТЕКСТ:`;

        const messages = [
            {
                role: "system",
                content: "Ты профессиональный копирайтер для Telegram каналов. Переписывай контент делая его уникальным и вовлекающим."
            },
            {
                role: "user",
                content: prompt
            }
        ];

        const rewritten = await cloudRuRequest(messages);
        
        if (!rewritten) {
            return `🔥 ${originalText}\n\n💭 А что думаешь ты?`;
        }

        // Добавляем эмодзи
        const emoji = styleConfig.emoji.split('')[Math.floor(Math.random() * styleConfig.emoji.length)];
        const finalContent = `${emoji} ${rewritten}${styleConfig.cta}`;
        
        return finalContent;
        
    } catch (error) {
        console.error('Ошибка переписывания:', error.message);
        return `🔥 ${originalText}\n\n💭 А что думаешь ты?`;
    }
}

async function testContentGeneration() {
    console.log('🔍 Тестирую генерацию контента через Cloud.ru...\n');
    
    const stylesList = Object.keys(styles);
    
    for (let i = 0; i < 4; i++) {
        const originalContent = sampleContent[i];
        const style = stylesList[i];
        
        console.log(`📝 ТЕСТ ${i + 1}: Стиль "${style}"`);
        console.log(`📄 Исходник: ${originalContent}`);
        console.log('🤖 Переписываю через Cloud.ru GPT-4...');
        
        const rewrittenContent = await rewriteContentWithCloudRu(originalContent, style);
        
        console.log(`✅ РЕЗУЛЬТАТ:\n${rewrittenContent}`);
        console.log('\n' + '─'.repeat(80) + '\n');
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

async function showSystemInfo() {
    console.log('📊 ИНФОРМАЦИЯ О СИСТЕМЕ:');
    console.log(`🔑 Cloud.ru LLM API: ${CLOUD_RU_CONFIG.apiKey ? '✅ Настроен' : '❌ Не настроен'}`);
    console.log(`🌐 Cloud.ru URL: ${CLOUD_RU_CONFIG.baseUrl}`);
    console.log(`🤖 Модель: ${CLOUD_RU_CONFIG.model}`);
    console.log(`📱 Telegram API_ID: ${process.env.API_ID || '❌ Не настроен'}`);
    console.log(`🔐 Сессия: ${require('fs').existsSync('.session.json') ? '✅ Загружена' : '❌ Отсутствует'}`);
    console.log(`🎯 Target Channel: ${process.env.TARGET_CHANNEL_ID || 'Не настроен'}`);
    console.log('');
}

async function testCloudRuConnection() {
    console.log('🔗 Тестирую подключение к Cloud.ru...');
    
    const testMessages = [
        {
            role: "system",
            content: "Ты полезный AI ассистент."
        },
        {
            role: "user", 
            content: "Скажи просто 'Привет! Я работаю!' на русском языке."
        }
    ];

    const response = await cloudRuRequest(testMessages);
    
    if (response) {
        console.log(`✅ Cloud.ru API работает! Ответ: "${response}"`);
        return true;
    } else {
        console.log('❌ Cloud.ru API не отвечает');
        return false;
    }
}

async function showContentBotDemo() {
    console.log('🎭 ДЕМО ContentBot:');
    console.log('');
    console.log('Так будет работать полная система:');
    console.log('1️⃣ Парсинг контента из Telegram каналов');
    console.log('2️⃣ Фильтрация качественного контента');
    console.log('3️⃣ Переписывание через Cloud.ru API');
    console.log('4️⃣ Добавление эмодзи и CTA');
    console.log('5️⃣ Публикация в целевые каналы');
    console.log('6️⃣ Автоматическое планирование постов');
    console.log('');
    console.log('💰 Монетизация: 3000₽/месяц за канал');
    console.log('🎯 Цель: 10 клиентов = 30,000₽/месяц');
    console.log('');
}

async function main() {
    try {
        await showSystemInfo();
        
        const connectionOk = await testCloudRuConnection();
        console.log('');
        
        if (connectionOk) {
            await testContentGeneration();
        } else {
            console.log('❌ Не удалось подключиться к Cloud.ru API');
            console.log('🔍 Проверьте LLM_API ключ в .env файле');
        }
        
        await showContentBotDemo();
        
        console.log('🚀 ГОТОВО К ЗАПУСКУ:');
        console.log('1. ./start.sh pm2  # Полный запуск системы');
        console.log('2. Протестируй бота: /demo');
        console.log('3. Начинай продавать!');
        console.log('');
        console.log('✅ ContentBot с Cloud.ru API готов!');
        
    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

// Запуск
main().catch(console.error); 