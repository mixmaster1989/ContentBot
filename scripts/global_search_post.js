// Global search -> parse -> LLM rewrite -> post via Bot API
// Usage: node scripts/global_search_post.js "channelChatId"

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

async function findTopChannels(client, query, limit = 5) {
  // Поиск каналов через contacts.Search
  const search = await client.invoke(new Api.contacts.Search({ q: query, limit: 20 }));
  const channels = (search.chats || []).filter((c) => c.className === 'Channel');
  
  if (channels.length === 0) return [];
  
  // Сортируем по количеству участников и берем топ
  const sortedChannels = channels
    .filter(ch => (ch.participantsCount || 0) > 100) // Минимум 100 участников
    .sort((a, b) => (b.participantsCount || 0) - (a.participantsCount || 0))
    .slice(0, limit);
  
  return sortedChannels;
}

async function fetchChannelContent(client, channel, postsCount = 2) {
  const res = await client.invoke(
    new Api.messages.GetHistory({ peer: channel, limit: 50 })
  );
  const msgs = (res.messages || []).filter((m) => m.message && typeof m.message === 'string');
  
  // Берем лучшие посты (длинные, осмысленные)
  const goodPosts = msgs
    .map((m) => m.message.trim())
    .filter((t) => t.length >= 120 && t.length <= 2000) // Оптимальная длина
    .filter((t) => !t.includes('http') && !t.includes('@') && !t.includes('#реклама'))
    .slice(0, postsCount);
  
  return goodPosts;
}

async function synthesizeContent(llm, posts, topic, style) {
  if (posts.length === 0) return null;
  
  const prompt = `На основе этих постов создай сильный, вовлекающий Telegram-пост на тему "${topic}" в стиле "${style}" для канала.

Исходные посты:
${posts.map((post, i) => `Пост ${i+1}: ${post}`).join('\n\n')}

Пиши по этапам:
1. Краткий цепляющий заголовок + эмодзи
2. 1-2 абзаца интригующего вступления (вопрос, кейс, крючок)
3. Основная часть: раскрой идею, объедини лучшие мысли, добавь примеры/истории или неожиданный факт
4. Короткое подведение с призывом к действию (CTA) — вопрос, «ответь в комментариях», «реагируй», «узнай больше» и др.
5. Форматируй: разбивай текст на абзацы, добавляй списки и подзаголовки, используй визуальные разделители типа ●—●, 🟦

Требования:
- Пост длиной 150-200 слов
- Эмодзи там, где уместно
- Оригинальный стиль, без «воды» и шаблонных фраз
- НЕ добавляй промпты, служебную инфу, «Пост…»
- Только готовый, уникальный Telegram-пост для публикации`;

  const result = await llm.generateFromScratch(prompt, style);
  return result?.text || null;
}

async function main() {
  const targetChatId = process.argv[2] ? Number(process.argv[2]) : Number(process.env.TARGET_CHANNEL_ID);
  if (!targetChatId) throw new Error('TARGET_CHANNEL_ID is required');

  const themes = [
    { query: 'software architecture', style: 'универсальный' },
    { query: 'large language models llm', style: 'мотивация' },
    { query: 'telegram mtproto', style: 'технологии' },
    { query: 'pm2 nodejs deploy', style: 'бизнес' },
    { query: 'security devops best practices', style: 'универсальный' },
  ];

  const mt = MTProtoClient.get();
  const client = mt.getClient();
  await client.connect();

  const bot = new Bot(process.env.BOT_TOKEN);
  const llm = new LLMRewriter();

  const results = [];

  for (const t of themes) {
    try {
      console.log(`🔍 Ищем каналы по теме: ${t.query}`);
      
      // Находим топ каналы по теме
      const channels = await findTopChannels(client, t.query, 3);
      if (channels.length === 0) {
        results.push({ query: t.query, skip: 'no_channels' });
        continue;
      }
      
      console.log(`📺 Найдено каналов: ${channels.length}`);
      channels.forEach((ch, i) => {
        console.log(`  ${i+1}. ${ch.title} (${ch.participantsCount} участников)`);
      });
      
      // Собираем контент из всех каналов
      const allPosts = [];
      for (const channel of channels) {
        const posts = await fetchChannelContent(client, channel, 2);
        allPosts.push(...posts);
      }
      
      if (allPosts.length === 0) {
        results.push({ query: t.query, channels: channels.length, skip: 'no_content' });
        continue;
      }
      
      console.log(`📝 Собрано постов: ${allPosts.length}`);
      
      // Синтезируем контент через LLM
      const synthesizedText = await synthesizeContent(llm, allPosts, t.query, t.style);
      if (!synthesizedText) {
        results.push({ query: t.query, posts: allPosts.length, skip: 'llm_failed' });
        continue;
      }
      
      // Очищаем и публикуем
      let text = synthesizedText
        .replace(/<think>.*?<\/think>/gs, '')
        .replace(/⚙|🔬|💡|📝|🎯/g, '')
        .replace(/^\s*[А-Я][а-я]*\s*:/gm, '')
        .trim();
      
      text = sanitizeStrict(text);
      const res = await bot.api.sendMessage(targetChatId, text, { disable_web_page_preview: true });
      
      results.push({ 
        query: t.query, 
        channels: channels.length, 
        posts: allPosts.length, 
        messageId: res.message_id 
      });
      
      console.log(`✅ Опубликован пост: ${res.message_id}`);
      
    } catch (e) {
      console.error(`❌ Ошибка для темы ${t.query}:`, e.message);
      results.push({ query: t.query, error: (e && e.message) || String(e) });
    }
  }

  console.log(JSON.stringify({ posted: results.filter(r=>r.messageId).length, results }, null, 2));
}

main().catch((e) => {
  console.error('PIPELINE_ERR', e && e.message || e);
  process.exit(1);
});



