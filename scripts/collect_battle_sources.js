// Сбор исходных постов для AI-баттла без публикации/LLM
const fs = require('fs');
const path = require('path');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

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
    .map((m) => ({ id: m.id, text: (m.message || '').trim() }))
    .filter((m) => m.text.length >= 120 && m.text.length <= 2000)
    .filter((m) => !m.text.includes('http') && !m.text.includes('@') && !m.text.includes('#реклама'))
    .slice(0, postsCount);
}

async function main() {
  const topic = process.env.TOPIC || 'нейросети';
  const mt = MTProtoClient.get();
  const client = mt.getClient();
  await client.connect();

  const channels = await findTopChannels(client, topic, 3);
  const collected = [];
  for (const ch of channels) {
    const posts = await fetchChannelContent(client, ch, 2);
    collected.push({ channel: { id: ch.id, title: ch.title, username: ch.username || null, participants: ch.participantsCount || 0 }, posts });
  }

  const payload = {
    topic,
    collectedCount: collected.reduce((acc, c) => acc + c.posts.length, 0),
    sources: collected,
    createdAt: new Date().toISOString()
  };

  const outDir = path.join(__dirname, '../data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'last_battle_sources.json');
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');
  console.log(JSON.stringify({ outPath, ...payload }, null, 2));

  await client.disconnect();
}

main().catch((e) => { console.error('COLLECT_SOURCES_ERR', e?.message || e); process.exit(1); });



