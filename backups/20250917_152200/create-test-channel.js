#!/usr/bin/env node
/**
 * 🚀 ContentBot - Создание тестового канала
 * Создает тестовый канал и постит туда контент
 */

require('dotenv').config();
const axios = require('axios');

console.log('🚀 ContentBot - Создание тестового канала');
console.log('='*50);

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN;

async function createTestChannel() {
    try {
        console.log('📺 Создаю тестовый канал через Admin Bot...');
        
        const response = await axios.post(
            `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/createChannel`,
            {
                title: 'ContentBot Test Channel',
                description: 'Тестовый канал для демонстрации ContentBot'
            }
        );

        if (response.data.ok) {
            const channelId = response.data.result.id;
            console.log(`✅ Канал создан! ID: ${channelId}`);
            return channelId;
        } else {
            console.log('❌ Не удалось создать канал через API');
            return null;
        }

    } catch (error) {
        console.error('❌ Ошибка создания канала:', error.message);
        return null;
    }
}

async function postToBot() {
    try {
        console.log('📤 Отправляю пост через основного бота...');
        
        const content = `🔥 ContentBot - ЖИВАЯ ДЕМОНСТРАЦИЯ!

Это автоматически созданный пост через нейросеть Cloud.ru

✨ Функции:
• Парсинг контента из Telegram
• Переписывание через GPT-4  
• Автопостинг по расписанию
• 10+ стилей написания

💰 Монетизация: 3000₽/месяц за канал

🚀 Кто хочет такую же систему?`;

        // Отправляем себе в личку
        const response = await axios.post(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                chat_id: process.env.OWNER_ID,
                text: content,
                parse_mode: 'Markdown'
            }
        );

        if (response.data.ok) {
            console.log('✅ Пост отправлен тебе в личку!');
            console.log(`📱 Message ID: ${response.data.result.message_id}`);
            return true;
        } else {
            console.log('❌ Ошибка отправки:', response.data);
            return false;
        }

    } catch (error) {
        console.error('❌ Ошибка отправки через бота:', error.message);
        return false;
    }
}

async function showInstructions() {
    console.log('\n📋 КАК УВИДЕТЬ РЕЗУЛЬТАТ:');
    console.log('');
    console.log('1️⃣ ПРОВЕРЬ TELEGRAM:');
    console.log('   📱 Открой Telegram на телефоне/компьютере');
    console.log(`   🤖 Найди бота по токену: ${BOT_TOKEN.split(':')[0]}`);
    console.log('   💬 Там должно быть сообщение от ContentBot');
    console.log('');
    console.log('2️⃣ ЕСЛИ НЕ ПРИШЛО:');
    console.log('   🔧 Запусти полную систему: ./start.sh pm2');
    console.log('   📝 Используй команду /demo в боте');
    console.log('');
    console.log('3️⃣ ГОТОВЫЙ КОНТЕНТ ВЫШЕ:');
    console.log('   📋 Скопируй и вручную запости куда нужно');
    console.log('   💾 Это пример того, что будет генериться');
    console.log('');
    console.log('4️⃣ ПОЛНАЯ СИСТЕМА:');
    console.log('   🚀 ./start.sh pm2');
    console.log('   💰 Готова к продажам!');
    console.log('');
}

async function main() {
    try {
        console.log('📊 Проверка токенов:');
        console.log(`🤖 BOT_TOKEN: ${BOT_TOKEN ? '✅' : '❌'}`);
        console.log(`👑 ADMIN_BOT_TOKEN: ${ADMIN_BOT_TOKEN ? '✅' : '❌'}`);
        console.log(`👤 OWNER_ID: ${process.env.OWNER_ID}`);
        console.log('');

        // Пробуем отправить пост тебе в личку
        const sent = await postToBot();
        
        if (sent) {
            console.log('🎉 УСПЕХ! Контент отправлен!');
        }

        await showInstructions();

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        await showInstructions();
    }
}

main().catch(console.error); 