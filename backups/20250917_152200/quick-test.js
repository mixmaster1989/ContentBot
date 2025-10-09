#!/usr/bin/env node
/**
 * 🚀 ContentBot - Быстрый тест
 * Показывает как будет работать система БЕЗ полного запуска
 */

require('dotenv').config();
const { OpenAI } = require('openai');

console.log('🚀 ContentBot - Быстрый тест контента');
console.log('='*50);

// Настройка OpenAI (используем твои ключи)
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1'
});

// Примеры исходного контента (имитируем парсинг)
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

async function rewriteContent(originalText, style) {
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

ПЕРЕПИСАННЫЙ ТЕКСТ:`;

        const response = await openai.chat.completions.create({
            model: "openai/gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Ты профессиональный копирайтер. Переписывай контент делая его уникальным и вовлекающим."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.8
        });

        let rewritten = response.choices[0].message.content.trim();
        
        // Добавляем эмодзи
        const emoji = styleConfig.emoji.split('')[Math.floor(Math.random() * styleConfig.emoji.length)];
        rewritten = `${emoji} ${rewritten}`;
        
        // Добавляем CTA
        rewritten += styleConfig.cta;
        
        return rewritten;
        
    } catch (error) {
        console.error('Ошибка LLM:', error.message);
        return `🔥 ${originalText}\n\n💭 А что думаешь ты?`;
    }
}

async function testContentGeneration() {
    console.log('🔍 Тестирую генерацию контента...\n');
    
    const stylesList = Object.keys(styles);
    
    for (let i = 0; i < 4; i++) {
        const originalContent = sampleContent[i];
        const style = stylesList[i];
        
        console.log(`📝 ТЕСТ ${i + 1}: Стиль "${style}"`);
        console.log(`📄 Исходник: ${originalContent}`);
        console.log('🤖 Переписываю через GPT-4...');
        
        const rewrittenContent = await rewriteContent(originalContent, style);
        
        console.log(`✅ РЕЗУЛЬТАТ:\n${rewrittenContent}`);
        console.log('\n' + '─'.repeat(60) + '\n');
        
        // Пауза между запросами
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

async function showSystemInfo() {
    console.log('📊 ИНФОРМАЦИЯ О СИСТЕМЕ:');
    console.log(`🔑 OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Настроен' : '❌ Не настроен'}`);
    console.log(`📱 Telegram API_ID: ${process.env.API_ID || '❌ Не настроен'}`);
    console.log(`🔐 Сессия: ${require('fs').existsSync('.session.json') ? '✅ Загружена' : '❌ Отсутствует'}`);
    console.log(`🎯 Target Channel: ${process.env.TARGET_CHANNEL_ID || 'Не настроен'}`);
    console.log('');
}

async function simulateRealWork() {
    console.log('🎭 СИМУЛЯЦИЯ РЕАЛЬНОЙ РАБОТЫ ContentBot:');
    console.log('');
    
    console.log('1️⃣ Парсинг контента из Telegram каналов...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('   ✅ Найдено 15 новых постов');
    
    console.log('2️⃣ Фильтрация качественного контента...');
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log('   ✅ Отобрано 8 подходящих постов');
    
    console.log('3️⃣ Переписывание через GPT-4...');
    await new Promise(resolve => setTimeout(resolve, 1200));
    console.log('   ✅ Создано 8 уникальных постов');
    
    console.log('4️⃣ Планирование публикации...');
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('   ✅ Запланировано на следующие 4 часа');
    
    console.log('5️⃣ Публикация в канал...');
    await new Promise(resolve => setTimeout(resolve, 800));
    console.log(`   ✅ Опубликовано в канал ${process.env.TARGET_CHANNEL_ID}`);
    
    console.log('');
    console.log('🎉 ЦИКЛ ЗАВЕРШЕН! Следующий запуск через 30 минут.');
}

async function showMonetizationInfo() {
    console.log('💰 МОНЕТИЗАЦИЯ ContentBot:');
    console.log('');
    console.log('📊 Тарифы:');
    console.log(`   💼 Ведение канала: ${process.env.MONTHLY_PRICE || 3000}₽/месяц`);
    console.log(`   ⚙️ Настройка канала: ${process.env.CHANNEL_SETUP_PRICE || 10000}₽`);
    console.log(`   👑 Премиум пакет: ${process.env.PREMIUM_PRICE || 15000}₽/месяц`);
    console.log('');
    console.log('🎯 Что получает клиент:');
    console.log('   • Автопостинг 10 раз в день');
    console.log('   • Уникальный контент через GPT-4');
    console.log('   • Настройка стиля под аудиторию');
    console.log('   • Статистика и аналитика');
    console.log('   • Техподдержка 24/7');
    console.log('');
    console.log('💡 При 10 клиентах = 30,000₽/месяц пассивного дохода!');
}

async function main() {
    try {
        await showSystemInfo();
        await testContentGeneration();
        await simulateRealWork();
        await showMonetizationInfo();
        
        console.log('');
        console.log('🚀 СЛЕДУЮЩИЕ ШАГИ:');
        console.log('1. Запусти полную систему: ./start.sh pm2');
        console.log('2. Протестируй бота: /demo команда');
        console.log('3. Начинай продавать услуги!');
        console.log('');
        console.log('✅ ContentBot готов к монетизации!');
        
    } catch (error) {
        console.error('❌ Ошибка тестирования:', error.message);
    }
}

// Запуск
main().catch(console.error); 