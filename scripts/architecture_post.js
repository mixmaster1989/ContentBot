// Скрипт для создания поста об архитектуре ContentBot
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');
const { LLMRewriter } = require('../llm/llm-rewriter');
const { Bot } = require('grammy');

function sanitizeStrict(s) {
  if (!s) return '';
  let out = '';
  const n = (s + '').normalize('NFC');
  for (const ch of n) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    // ВАЖНО: Сохраняем переносы строк (\n = 10, \r = 13)
    if (cp === 10 || cp === 13) {
      out += ch;
      continue;
    }
    if (
      (cp >= 0x00 && cp <= 0x1f) || cp === 0x7f || (cp >= 0x80 && cp <= 0x9f) ||
      (cp >= 0xd800 && cp <= 0xdfff) || (cp >= 0xfdd0 && cp <= 0xfdef) ||
      ((cp & 0xffff) === 0xfffe) || ((cp & 0xffff) === 0xffff) ||
      (cp >= 0x200b && cp <= 0x200f) || (cp >= 0x202a && cp <= 0x202e) ||
      (cp >= 0x2060 && cp <= 0x206f)
    ) {
      continue;
    }
    out += ch;
  }
  out = out
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2190-\u21FF]/g, '→');
  return out;
}

async function findTopChannels(client, query, limit = 3) {
  const search = await client.invoke(new Api.contacts.Search({ q: query, limit: 20 }));
  const channels = (search.chats || []).filter((c) => c.className === 'Channel');
  
  if (channels.length === 0) return [];
  
  const sortedChannels = channels
    .filter(ch => (ch.participantsCount || 0) > 100)
    .sort((a, b) => (b.participantsCount || 0) - (a.participantsCount || 0))
    .slice(0, limit);
  
  return sortedChannels;
}

async function fetchChannelContent(client, channel, postsCount = 2) {
  const res = await client.invoke(
    new Api.messages.GetHistory({ peer: channel, limit: 50 })
  );
  const msgs = (res.messages || []).filter((m) => m.message && typeof m.message === 'string');
  
  const goodPosts = msgs
    .map((m) => m.message.trim())
    .filter((t) => t.length >= 120 && t.length <= 2000)
    .filter((t) => !t.includes('http') && !t.includes('@') && !t.includes('#реклама'))
    .slice(0, postsCount);
  
  return goodPosts;
}

async function synthesizeContent(llm, posts, topic, style) {
  if (posts.length === 0) return null;
  
  const prompt = `На основе этих постов создай сильный, вовлекающий Telegram-пост на тему "${topic}" в стиле "${style}" для канала.

Исходные посты:
${posts.map((post, i) => `Пост ${i+1}: ${post}`).join('\n\n')}

ОБЯЗАТЕЛЬНО используй эту структуру:

🚀 **Заголовок с эмодзи** 

Короткое вступление (1-2 предложения)

●—●

**Основная часть:**
• Пункт 1
• Пункт 2  
• Пункт 3

🟦 **Интересный факт или пример**

Вопрос для вовлечения аудитории

ЭМОДЗИ ДЛЯ TELEGRAM (используй уместно):
🚀 - старт, запуск, технологии
💡 - идеи, инсайты, мысли
⚡ - энергия, скорость, мотивация
🎯 - цели, фокус, результат
🔥 - тренды, популярное, горячее
💻 - IT, программирование, технологии
🤖 - AI, автоматизация, будущее
📊 - данные, аналитика, статистика
🔧 - инструменты, настройка, решение
🌟 - качество, премиум, лучшие
💪 - сила, мотивация, достижения
🎉 - успех, празднование, радость
🤔 - размышления, вопросы, сомнения
💯 - отлично, идеально, 100%
🚨 - важное, внимание, предупреждение
📈 - рост, развитие, прогресс
🎨 - креатив, дизайн, искусство
🔍 - поиск, исследование, анализ
💎 - ценность, драгоценное, качество
🎪 - развлечения, интересное, яркое

Требования:
- ОБЯЗАТЕЛЬНО используй разделители ●—● и 🟦
- ОБЯЗАТЕЛЬНО делай списки с • 
- ОБЯЗАТЕЛЬНО выделяй подзаголовки **жирным**
- Используй 3-5 эмодзи из списка выше уместно
- Пост длиной 150-200 слов
- НЕ добавляй промпты, служебную инфу
- Только готовый пост для публикации`;

  // Временно меняем модель на DeepSeek для лучшего форматирования
  const originalModel = llm.modelRouting.primary;
  llm.modelRouting.primary = 'deepseek/deepseek-v3.1';
  
  const result = await llm.generateFromScratch(prompt, style);
  
  // Восстанавливаем оригинальную модель
  llm.modelRouting.primary = originalModel;
  return result?.text || null;
}

async function main() {
  const targetChatId = -1003191582439; // FreemiumContentBot
  
  console.log('🚀 Запуск скрипта архитектуры ContentBot...');
  
  const mt = MTProtoClient.get();
  const client = mt.getClient();
  await client.connect();
  
  const bot = new Bot(process.env.BOT_TOKEN);
  const llm = new LLMRewriter();
  
  const topic = 'software architecture';
  const style = 'технологии';
  
  try {
    console.log(`🔍 Ищем каналы по теме: ${topic}`);
    
    // Находим топ каналы
    const channels = await findTopChannels(client, topic, 3);
    if (channels.length === 0) {
      console.log('❌ Каналы не найдены');
      return;
    }
    
    console.log(`📺 Найдено каналов: ${channels.length}`);
    channels.forEach((ch, i) => {
      console.log(`  ${i+1}. ${ch.title} (${ch.participantsCount} участников)`);
    });
    
    // Собираем контент
    const allPosts = [];
    for (const channel of channels) {
      const posts = await fetchChannelContent(client, channel, 2);
      allPosts.push(...posts);
    }
    
    if (allPosts.length === 0) {
      console.log('❌ Контент не найден');
      return;
    }
    
    console.log(`📝 Собрано постов: ${allPosts.length}`);
    
    // Синтезируем через LLM
    const synthesizedText = await synthesizeContent(llm, allPosts, topic, style);
    if (!synthesizedText) {
      console.log('❌ LLM не сгенерировал пост');
      return;
    }
    
    // Очищаем и публикуем
    let text = synthesizedText
      .replace(/<think>.*?<\/think>/gs, '')
      .replace(/⚙|🔬|💡|📝|🎯/g, '')
      .replace(/^\s*[А-Я][а-я]*\s*:/gm, '')
      .trim();
    
    // ПРИНУДИТЕЛЬНО добавляем форматирование
    text = text
      .replace(/●-●/g, '\n\n●—●\n\n')  // Разделитель с переносами
      .replace(/🟦/g, '\n\n🟦')         // Блок с переносом
      .replace(/\*\*([^*]+)\*\*/g, '\n\n**$1**\n\n') // Заголовки с переносами
      .replace(/\r\n/g, '\n')         // Нормализуем переносы
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')     // Не больше двух переносов подряд
      .replace(/\s+\n/g, '\n')        // Убираем хвостовые пробелы перед переносом
      .replace(/\n\s+/g, '\n')        // Убираем ведущие пробелы после переноса
      .replace(/\s+$/gm, '')            // Хвостовые пробелы в строках
      .replace(/\n?\s*•\s*/g, '\n\n• ') // Списки с переносами
      .replace(/\*\*([^*]+)\*\*:\s*/g, '**$1**\n\n') // Заголовки списков с переносами
      .trim();
    
    // Применяем sanitizeStrict ПОСЛЕ форматирования
    text = sanitizeStrict(text);
    
    console.log('📤 Публикуем пост...');
    console.log('📄 Форматированный текст:');
    console.log(text);
    
    const res = await bot.api.sendMessage(targetChatId, text, { 
      disable_web_page_preview: true
    });
    
    console.log(`✅ Пост опубликован! ID: ${res.message_id}`);
    console.log('\n📄 Содержимое поста:');
    console.log(text);
    
  } catch (e) {
    console.error('❌ Ошибка:', e.message);
  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
