const { Database } = require('./core/database');
const { ContentParser } = require('./parsers/content-parser');
const { LLMRewriter } = require('./llm/llm-rewriter');
const { ChannelManager } = require('./core/channel-manager');

async function testAutopost() {
  console.log('🧪 Тестируем автопостинг...');
  
  try {
    // Инициализируем компоненты
    const db = new Database();
    await db.init();
    
    const parser = new ContentParser();
    await parser.init();
    
    const llm = new LLMRewriter();
    
    const channelManager = new ChannelManager();
    await channelManager.init(parser.client);
    
    // Получаем активные каналы
    const activeChannels = await db.getActiveChannels();
    console.log(`📺 Найдено активных каналов: ${activeChannels.length}`);
    
    for (let channel of activeChannels) {
      console.log(`\n🔄 Обрабатываем канал: ${channel.channel_name}`);
      
      try {
        if (channel.posts_today >= 10) {
          console.log(`⏭️ Лимит постов достигнут (${channel.posts_today}/10)`);
          continue;
        }
        
        // Генерируем контент
        console.log('📝 Генерируем контент...');
        const content = await generateContent(llm, channel.style);
        
        // Публикуем в канал
        console.log('📤 Публикуем в канал...');
        const result = await channelManager.postToChannel(
          channel.channel_id, 
          content, 
          channel.style
        );
        
        if (result.success) {
          // Обновляем счетчик постов
          await db.updateChannelPostsToday(channel.id, channel.posts_today + 1);
          console.log(`✅ Пост опубликован в канал ${channel.channel_name}`);
        } else {
          console.log(`❌ Ошибка публикации: ${result.error}`);
        }
        
      } catch (error) {
        console.error(`❌ Ошибка обработки канала ${channel.channel_name}:`, error.message);
      }
    }
    
    console.log('\n🎉 Тест автопостинга завершен!');
    
  } catch (error) {
    console.error('❌ Ошибка теста:', error);
  }
}

async function generateContent(llm, style) {
  // Простой контент для теста
  const testContent = `
🚀 ContentBot - Нейро-контент агентство!

🔥 Что я умею:
• Автоматически веду Telegram каналы
• Парсю топовый контент и переписываю через ИИ  
• Генерирую уникальные посты с картинками
• Постю по расписанию 24/7

💡 Это тестовый пост для проверки системы автопостинга!

✨ Согласен? Ставь ❤️
  `;
  
  try {
    const rewritten = await llm.rewriteContent(testContent, style);
    return rewritten;
  } catch (error) {
    console.log('⚠️ LLM недоступен, используем базовый контент');
    return testContent;
  }
}

// Запускаем тест
testAutopost().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Критическая ошибка:', err);
  process.exit(1);
});
