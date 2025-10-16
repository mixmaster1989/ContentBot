// AI Battle: парсинг по теме -> синтез -> генерация 4 моделями -> публикация
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
    if (cp === 10 || cp === 13) { out += ch; continue; }
    if (
      (cp >= 0x00 && cp <= 0x1f) || cp === 0x7f || (cp >= 0x80 && cp <= 0x9f) ||
      (cp >= 0xd800 && cp <= 0xdfff) || (cp >= 0xfdd0 && cp <= 0xfdef) ||
      ((cp & 0xffff) === 0xfffe) || ((cp & 0xffff) === 0xffff) ||
      (cp >= 0x200b && cp <= 0x200f) || (cp >= 0x202a && cp <= 0x202e) ||
      (cp >= 0x2060 && cp <= 0x206f)
    ) { continue; }
    out += ch;
  }
  return out
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2190-\u21FF]/g, '→');
}

async function findTopChannels(client, query, limit = 3) {
  const search = await client.invoke(new Api.contacts.Search({ q: query, limit: 20 }));
  const channels = (search.chats || []).filter((c) => c.className === 'Channel');
  return channels
    .filter(ch => (ch.participantsCount || 0) > 100)
    .sort((a, b) => (b.participantsCount || 0) - (a.participantsCount || 0))
    .slice(0, limit);
}

async function fetchChannelContent(client, channel, postsCount = 2) {
  const res = await client.invoke(new Api.messages.GetHistory({ peer: channel, limit: 50 }));
  const msgs = (res.messages || []).filter((m) => m.message && typeof m.message === 'string');
  return msgs
    .map((m) => m.message.trim())
    .filter((t) => t.length >= 120 && t.length <= 2000)
    .filter((t) => !t.includes('http') && !t.includes('@') && !t.includes('#реклама'))
    .slice(0, postsCount);
}

function buildSynthesisPrompt(posts, topic, style) {
  return `На основе этих постов создай сильный, вовлекающий Telegram-пост на тему "${topic}" в стиле "${style}" для канала.

Исходные посты:
${posts.map((p, i) => `Пост ${i + 1}: ${p}`).join('\n\n')}

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

ЭМОДЗИ (используй уместно): 🚀 💡 ⚡ 🎯 🔥 💻 🤖 📊 🔧 🌟 💪 🎉 🤔 💯 🚨 📈 🎨 🔍 💎 🎪

Требования:
- ОБЯЗАТЕЛЬНО используй разделители ●—● и 🟦
- ОБЯЗАТЕЛЬНО делай списки с •
- ОБЯЗАТЕЛЬНО выделяй подзаголовки **жирным**
- Используй 3-5 эмодзи из списка
- Пост 150-200 слов
- НЕ добавляй промпты/служебную инфу
- Только готовый текст для публикации`;
}

// RAW mode: публикуем как есть, только мягкая очистка
function toRawPost(text) {
  const withoutThink = (text || '').replace(/<think>[\s\S]*?<\/think>/gi, '');
  // Сохраняем все переносы, убираем только опасные управляющие
  const safe = sanitizeStrict(withoutThink);
  // Telegram лимит ~4096 символов
  return safe.length > 4000 ? safe.slice(0, 3996) + '…' : safe;
}

async function main() {
  const topic = 'нейросети';
  const style = 'технологии';
  const targetChatId = Number(process.env.TARGET_CHANNEL_ID) || -1003191582439;

  const mt = MTProtoClient.get();
  const client = mt.getClient();
  await client.connect();

  const bot = new Bot(process.env.BOT_TOKEN);
  const llm = new LLMRewriter();

  console.log(`🔍 Ищем каналы по теме: ${topic}`);
  const channels = await findTopChannels(client, topic, 3);
  if (channels.length === 0) throw new Error('Каналы по теме не найдены');
  channels.forEach((c, i) => console.log(`  ${i + 1}. ${c.title} (${c.participantsCount})`));

  const allPosts = [];
  for (const ch of channels) {
    const posts = await fetchChannelContent(client, ch, 2);
    allPosts.push(...posts);
  }
  if (allPosts.length === 0) throw new Error('Контент не найден');
  console.log(`📝 Собрано постов: ${allPosts.length}`);

  const prompt = buildSynthesisPrompt(allPosts, topic, style);

  const models = [
    { id: 'deepseek/deepseek-r1-0528', label: 'DeepSeek R1-0528' },
    { id: 'mistralai/mistral-small-3.2-24b-instruct-2506', label: 'Mistral Small 3.2 24B' },
    { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B' },
    { id: 'switchpoint/router', label: 'Switchpoint Router' }
  ];

  const results = [];

  for (const m of models) {
    try {
      console.log(`🤖 Генерация моделью: ${m.label} (${m.id})`);
      const resp = await llm.ai.makeRequest([
        { role: 'user', content: prompt }
      ], m.id, { max_tokens: 400, temperature: 0.7 });
      const raw = resp?.choices?.[0]?.message?.content || resp?.text || '';
      const text = toRawPost(raw);
      const header = `[#AI_BATTLE RAW | ${m.label}]`;
      const payload = `${header}\n\n${text}`;
      const sent = await bot.api.sendMessage(targetChatId, payload, { disable_web_page_preview: true });
      results.push({ model: m.id, messageId: sent.message_id, ok: true });
      console.log(`✅ Опубликовано: ${sent.message_id}`);
    } catch (e) {
      console.error(`❌ Ошибка модели ${m.id}:`, e.message);
      results.push({ model: m.id, ok: false, error: e.message });
    }
  }

  console.log(JSON.stringify({ posted: results.filter(r=>r.ok).length, results }, null, 2));
  await client.disconnect();
}

main().catch((e) => { console.error('AI_BATTLE_ERR', e?.message || e); process.exit(1); });


