// AI Battle from saved JSON sources (RAW mode, keep reasoning)
const fs = require('fs');
const path = require('path');
const { LLMRewriter } = require('../llm/llm-rewriter');
const { Bot } = require('grammy');

function readSources(jsonPath) {
  const p = jsonPath || path.join(__dirname, '../data/last_battle_sources.json');
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function buildPromptFromSources(payload, topic = 'нейросети', style = 'технологии') {
  const posts = payload.sources.flatMap(s => s.posts.map(p => p.text));
  return `На основе этих постов создай сильный, вовлекающий Telegram-пост на тему "${topic}" в стиле "${style}" для канала. Используй 3-5 эмодзи. Только готовый текст для публикации. Разрешены размышления <think>...</think> перед ответом.

Исходные посты:
${posts.map((p, i) => `Пост ${i + 1}: ${p}`).join('\n\n')}`;
}

function minimalSafe(text) {
  if (!text) return '';
  // Сохраняем всё, включая <think>, только убираем опасные управления, оставляем \n/\r
  let out = '';
  const n = String(text);
  for (const ch of n) {
    const cp = ch.codePointAt(0);
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
  return out.length > 4000 ? out.slice(0, 3996) + '…' : out;
}

async function main() {
  const targetChatId = Number(process.env.TARGET_CHANNEL_ID) || -1003191582439;
  const bot = new Bot(process.env.BOT_TOKEN);
  const llm = new LLMRewriter();

  const payload = readSources();
  const prompt = buildPromptFromSources(payload, payload.topic || 'нейросети', 'технологии');

  const models = [
    { id: 'deepseek/deepseek-r1-0528', label: 'DeepSeek R1-0528' },
    { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { id: 'qwen/qwen3-235b-a22b-2507', label: 'Qwen3 235B A22B Instruct 2507' },
    { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
  ];

  const results = [];
  for (const m of models) {
    try {
      const resp = await llm.ai.makeRequest([
        { role: 'user', content: prompt }
      ], m.id, { max_tokens: 10000, temperature: 0.7 });
      const raw = resp?.choices?.[0]?.message?.content || resp?.text || '';
      const toPost = minimalSafe(`[#AI_BATTLE RAW JSON | ${m.label}]\n\n${raw}`);
      const sent = await bot.api.sendMessage(targetChatId, toPost, { disable_web_page_preview: true });
      results.push({ model: m.id, messageId: sent.message_id, ok: true });
    } catch (e) {
      results.push({ model: m.id, ok: false, error: e.message });
    }
  }

  console.log(JSON.stringify({ posted: results.filter(r => r.ok).length, results }, null, 2));
}

main().catch(e => { console.error('AI_BATTLE_JSON_RAW_ERR', e?.message || e); process.exit(1); });


