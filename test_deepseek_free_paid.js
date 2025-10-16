// Проверка DeepSeek R1-0528: платная и бесплатная версии, RAW ответ, max_tokens=10000
const fetch = require('node-fetch');

const API_BASE = 'https://openrouter.ai/api/v1';

function headers() {
  const key = process.env.OPENROUTER_API_KEY_PAID;
  if (!key) throw new Error('OPENROUTER_API_KEY_PAID не установлен');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://github.com/contentbot',
    'X-Title': 'ContentBot DeepSeek Probe'
  };
}

async function listUserModels() {
  const res = await fetch(`${API_BASE}/models/user`, { headers: headers() });
  if (!res.ok) throw new Error(`List models failed: ${res.status}`);
  const data = await res.json();
  return data.data || [];
}

function findDeepseekIds(models) {
  const ids = models.map(m => m.id);
  const paid = ids.find(id => /deepseek\/(deepseek-)?r1-0528(?!:free)/i.test(id));
  const free = ids.find(id => /deepseek\/(deepseek-)?r1-0528:free/i.test(id));
  return { paid, free };
}

async function ask(model, content) {
  const body = {
    model,
    messages: [{ role: 'user', content }],
    max_tokens: 10000,
    temperature: 0.7
  };
  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body)
  });
  const status = res.status;
  let json;
  try { json = await res.json(); } catch { json = { raw: await res.text() }; }
  const text = json?.choices?.[0]?.message?.content || json?.text || null;
  return { status, text, raw: json };
}

async function main() {
  const models = await listUserModels();
  const { paid, free } = findDeepseekIds(models);
  console.log('DeepSeek IDs:', { paid, free });
  const prompt = 'Коротко: как дела? Ответь на русском. Можно думать в <think>.';
  const results = [];
  if (paid) {
    const r = await ask(paid, prompt);
    results.push({ type: 'paid', model: paid, status: r.status, length: (r.text||'').length, text: r.text });
  }
  if (free) {
    const r = await ask(free, prompt);
    results.push({ type: 'free', model: free, status: r.status, length: (r.text||'').length, text: r.text });
  }
  console.log('\nRESULTS:', JSON.stringify(results, null, 2));
}

main().catch(e => { console.error('DEEPSEEK_FREE_PAID_ERR', e?.message || e); process.exit(1); });



