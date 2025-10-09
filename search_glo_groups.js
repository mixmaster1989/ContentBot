const { TelegramApi } = require("telegram");
const { StringSession } = require("telegram/sessions");
const fs = require("fs");
const path = require("path");

// Загружаем переменные окружения
require("dotenv").config();

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION_STRING;

if (!apiId || !apiHash || !sessionString) {
    console.error("❌ Отсутствуют переменные окружения TELEGRAM_API_ID, TELEGRAM_API_HASH или TELEGRAM_SESSION_STRING");
    process.exit(1);
}

const client = new TelegramApi(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
});

async function searchGloGroups() {
    try {
        console.log("🔍 Подключение к Telegram...");
        await client.connect();
        console.log("✅ Подключен к Telegram");
        
        // Ключевые слова для поиска GLO
        const searchTerms = [
            "glo",
            "гло", 
            "стики glo",
            "стики neo",
            "glo hyper",
            "glo pro",
            "нагреватель табака",
            "устройство glo",
            "дешево glo",
            "акция glo",
            "опт glo"
        ];
        
        const results = [];
        
        for (const term of searchTerms) {
            console.log(`🔍 Поиск по запросу: "${term}"`);
            
            try {
                const result = await client.invoke(new Api.contacts.Search({
                    q: term,
                    limit: 50
                }));
                
                if (result.chats && result.chats.length > 0) {
                    console.log(`✅ Найдено ${result.chats.length} чатов для "${term}"`);
                    
                    for (const chat of result.chats) {
                        if (chat.className === "Channel" || chat.className === "Chat") {
                            const chatInfo = {
                                id: chat.id.toString(),
                                title: chat.title || "Без названия",
                                username: chat.username || null,
                                participantsCount: chat.participantsCount || 0,
                                type: chat.className,
                                searchTerm: term,
                                description: chat.about || ""
                            };
                            
                            // Фильтруем только русскоязычные группы с достаточным количеством участников
                            if (chatInfo.participantsCount > 10 && 
                                (chatInfo.title.toLowerCase().includes("glo") || 
                                 chatInfo.title.toLowerCase().includes("гло") ||
                                 chatInfo.description.toLowerCase().includes("glo") ||
                                 chatInfo.description.toLowerCase().includes("гло"))) {
                                results.push(chatInfo);
                                console.log(`📺 ${chatInfo.title} (@${chatInfo.username || "нет"}) - ${chatInfo.participantsCount} участников`);
                            }
                        }
                    }
                } else {
                    console.log(`❌ Ничего не найдено для "${term}"`);
                }
                
                // Пауза между запросами
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Ошибка поиска для "${term}":`, error.message);
            }
        }
        
        // Удаляем дубликаты
        const uniqueResults = results.filter((chat, index, self) => 
            index === self.findIndex(c => c.id === chat.id)
        );
        
        console.log(`\n📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ:`);
        console.log(`📈 Найдено уникальных групп: ${uniqueResults.length}`);
        
        if (uniqueResults.length > 0) {
            console.log(`\n📋 СПИСОК НАЙДЕННЫХ ГРУПП GLO:`);
            console.log("=".repeat(80));
            
            uniqueResults.forEach((chat, index) => {
                console.log(`${index + 1}. 📺 ${chat.title}`);
                console.log(`   🆔 ID: ${chat.id}`);
                console.log(`   👥 Участников: ${chat.participantsCount}`);
                console.log(`   📊 Тип: ${chat.type}`);
                console.log(`   👤 Username: @${chat.username || "нет"}`);
                console.log(`   🔍 Найден по: ${chat.searchTerm}`);
                if (chat.description) {
                    console.log(`   📝 Описание: ${chat.description.substring(0, 100)}...`);
                }
                console.log("");
            });
            
            // Сохраняем результаты в файл
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `glo_groups_${timestamp}.json`;
            const filepath = path.join(__dirname, "logs", filename);
            
            // Создаем папку logs если её нет
            if (!fs.existsSync(path.join(__dirname, "logs"))) {
                fs.mkdirSync(path.join(__dirname, "logs"));
            }
            
            fs.writeFileSync(filepath, JSON.stringify(uniqueResults, null, 2));
            console.log(`💾 Результаты сохранены в: ${filepath}`);
        }
        
    } catch (error) {
        console.error("❌ Критическая ошибка:", error);
    } finally {
        await client.disconnect();
    }
}

// Запускаем поиск
searchGloGroups();
