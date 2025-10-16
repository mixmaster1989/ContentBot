// Проверка платных моделей по имени через OpenRouter API
const fetch = require('node-fetch');

const API_BASE = 'https://openrouter.ai/api/v1';

function authHeaders() {
  const key = process.env.OPENROUTER_API_KEY_PAID;
  if (!key) throw new Error('OPENROUTER_API_KEY_PAID не установлен');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/contentbot',
    'X-Title': 'ContentBot Model Probe'
  };
}

function matchModels(list, needles) {
  const lc = (s) => (s || '').toLowerCase();
  const results = [];
  for (const m of list) {
    const id = lc(m.id);
    const name = lc(m.name || '');
    for (const n of needles) {
      if (id.includes(n) || name.includes(n)) {
        results.push({ id: m.id, name: m.name || m.id });
        break;
      }
    }
  }
  // dedupe by id
  const seen = new Set();
  return results.filter(r => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

async function listUserModels() {
  const res = await fetch(`${API_BASE}/models/user`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`List models failed: ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

async function askModel(modelId, text) {
  const body = {
    model: modelId,
    messages: [{ role: 'user', content: text }],
    max_tokens: 64,
    temperature: 0.7
  };
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });
  const status = res.status;
  let json;
  try { json = await res.json(); } catch { json = { raw: await res.text() }; }
  const content = json?.choices?.[0]?.message?.content || null;
  return { status, content, raw: json };
}

async function main() {
  const needles = [
    'qwen3-235b', 'a22b',
    'claude 4.5 sonnet', 'claude-4.5-sonnet', 'sonnet 4.5',
    'gemini-2.5-pro', 'gemini 2.5 pro'
  ];
  const userModels = await listUserModels();
  const matched = matchModels(userModels, needles);
  console.log('Matched models:', matched);
  const results = [];
  for (const m of matched) {
    try {
      const r = await askModel(m.id, 'Как дела?');
      results.push({ model: m, status: r.status, content: r.content });
    } catch (e) {
      results.push({ model: m, error: e.message });
    }
  }
  console.log('\nResponses:', JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('PREMIUM_MODELS_ERR', e?.message || e); process.exit(1); });



