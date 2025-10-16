// RAW пост: Switchpoint Router с max_tokens=10000 по теме нейросети
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
    if ((cp >= 0x00 && cp <= 0x1f) || cp === 0x7f || (cp >= 0x80 && cp <= 0x9f) ||
        (cp >= 0xd800 && cp <= 0xdfff) || (cp >= 0xfdd0 && cp <= 0xfdef) ||
        ((cp & 0xffff) === 0xfffe) || ((cp & 0xffff) === 0xffff) ||
        (cp >= 0x200b && cp <= 0x200f) || (cp >= 0x202a && cp <= 0x202e) ||
        (cp >= 0x2060 && cp <= 0x206f)) { continue; }
    out += ch;
  }
  return out;
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

function buildPrompt(posts, topic, style) {
  return `На основе этих постов создай сильный, вовлекающий Telegram-пост на тему "${topic}" в стиле "${style}" для канала. Используй 3-5 эмодзи. Только готовый текст.

Исходные посты:
${posts.map((p, i) => `Пост ${i + 1}: ${p}`).join('\n\n')}`;
}

function toRaw(text) {
  const t = (text || '').replace(/<think>[\s\S]*?<\/think>/gi, '');
  const safe = sanitizeStrict(t);
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

  const channels = await findTopChannels(client, topic, 3);
  const allPosts = [];
  for (const ch of channels) {
    const posts = await fetchChannelContent(client, ch, 2);
    allPosts.push(...posts);
  }
  const prompt = buildPrompt(allPosts, topic, style);

  const modelId = 'switchpoint/router';
  const resp = await llm.ai.makeRequest([
    { role: 'user', content: prompt }
  ], modelId, { max_tokens: 10000, temperature: 0.7 });

  const raw = resp?.choices?.[0]?.message?.content || resp?.text || '';
  const text = toRaw(raw);
  const header = `[#AI_BATTLE RAW | Switchpoint Router x10000]`;
  const payload = `${header}\n\n${text}`;
  const sent = await bot.api.sendMessage(targetChatId, payload, { disable_web_page_preview: true });
  console.log(JSON.stringify({ model: modelId, messageId: sent.message_id, length: text.length }, null, 2));
  await client.disconnect();
}

main().catch((e) => { console.error('SWITCHPOINT_RAW_ERR', e?.message || e); process.exit(1); });



