// Построение каталога тематик: поиск ТОП-каналов для каждой темы
const fs = require('fs');
const path = require('path');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

function readConfig() {
  const configPath = path.join(__dirname, '../data/topic_catalog_config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

function ensureDataDir() {
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

function ensureDocsDir() {
  const docsDir = path.join(__dirname, '../docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  return docsDir;
}

async function findTopChannels(client, searchQuery, limit = 5) {
  try {
    const search = await client.invoke(new Api.contacts.Search({ 
      q: searchQuery, 
      limit: 20 
    }));
    
    const channels = (search.chats || [])
      .filter((c) => c.className === 'Channel')
      .filter(ch => (ch.participantsCount || 0) > 100)
      .sort((a, b) => (b.participantsCount || 0) - (a.participantsCount || 0))
      .slice(0, limit)
      .map(ch => ({
        id: ch.id.toString(),
        title: ch.title || 'Без названия',
        username: ch.username || null,
        participants: ch.participantsCount || 0
      }));
    
    return channels;
  } catch (error) {
    console.error(`Ошибка поиска для "${searchQuery}":`, error.message);
    return [];
  }
}

async function processTopic(client, topic, index, total) {
  console.log(`[${index + 1}/${total}] Обрабатываю: ${topic.name}`);
  console.log(`  Поиск: "${topic.searchQuery}"`);
  
  const channels = await findTopChannels(client, topic.searchQuery, 5);
  
  const result = {
    ...topic,
    channelsFound: channels.length,
    channels: channels,
    processedAt: new Date().toISOString()
  };
  
  if (channels.length === 0) {
    console.log(`  ⚠️  Каналы не найдены`);
  } else if (channels.length < 3) {
    console.log(`  ⚠️  Найдено только ${channels.length} каналов (меньше 3)`);
  } else if (channels.length < 5) {
    console.log(`  ✅ Найдено ${channels.length} каналов (меньше 5, но больше 3)`);
  } else {
    console.log(`  ✅ Найдено ${channels.length} каналов (ТОП-5)`);
  }
  
  // Показываем найденные каналы
  channels.forEach((ch, i) => {
    console.log(`    ${i + 1}. ${ch.title} (${ch.participants} участников)`);
  });
  
  return result;
}

function generateMarkdownReport(results) {
  const categories = {};
  
  // Группируем по категориям
  results.forEach(topic => {
    if (!categories[topic.category]) {
      categories[topic.category] = [];
    }
    categories[topic.category].push(topic);
  });
  
  let md = `# Каталог тематик ContentBot\n\n`;
  md += `**Сгенерировано:** ${new Date().toLocaleString('ru-RU')}\n\n`;
  md += `**Всего тем:** ${results.length}\n`;
  md += `**Тем с каналами:** ${results.filter(t => t.channelsFound > 0).length}\n`;
  md += `**Тем с ТОП-5:** ${results.filter(t => t.channelsFound >= 5).length}\n`;
  md += `**Тем с ТОП-3:** ${results.filter(t => t.channelsFound >= 3).length}\n\n`;
  
  // Таблица по категориям
  Object.keys(categories).sort().forEach(category => {
    md += `## ${category}\n\n`;
    md += `| Тема | Найдено | ТОП-3 канала |\n`;
    md += `|------|---------|-------------|\n`;
    
    categories[category].forEach(topic => {
      const top3 = topic.channels.slice(0, 3);
      const channelNames = top3.length > 0 
        ? top3.map(ch => ch.title).join(', ')
        : 'Не найдены';
      
      const status = topic.channelsFound === 0 ? '❌' : 
                    topic.channelsFound < 3 ? '⚠️' : '✅';
      
      md += `| ${status} ${topic.name} | ${topic.channelsFound} | ${channelNames} |\n`;
    });
    
    md += `\n`;
  });
  
  // Предупреждения
  const problematic = results.filter(t => t.channelsFound < 3);
  if (problematic.length > 0) {
    md += `## ⚠️ Темы с недостаточным количеством каналов\n\n`;
    md += `| Тема | Найдено | Категория |\n`;
    md += `|------|---------|----------|\n`;
    
    problematic.forEach(topic => {
      md += `| ${topic.name} | ${topic.channelsFound} | ${topic.category} |\n`;
    });
    
    md += `\n`;
  }
  
  // Статистика
  md += `## Статистика\n\n`;
  md += `- **Всего обработано тем:** ${results.length}\n`;
  md += `- **Тем с 5+ каналами:** ${results.filter(t => t.channelsFound >= 5).length}\n`;
  md += `- **Тем с 3-4 каналами:** ${results.filter(t => t.channelsFound >= 3 && t.channelsFound < 5).length}\n`;
  md += `- **Тем с 1-2 каналами:** ${results.filter(t => t.channelsFound > 0 && t.channelsFound < 3).length}\n`;
  md += `- **Тем без каналов:** ${results.filter(t => t.channelsFound === 0).length}\n\n`;
  
  return md;
}

async function main() {
  console.log('🚀 Запуск построения каталога тематик...\n');
  
  // Подключение к MTProto
  const mt = MTProtoClient.get();
  const client = mt.getClient();
  await client.connect();
  console.log('✅ Подключение к Telegram установлено\n');
  
  // Чтение конфига
  const config = readConfig();
  const topics = config.topics;
  console.log(`📋 Загружено ${topics.length} тематик\n`);
  
  // Обработка каждой темы
  const results = [];
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const result = await processTopic(client, topic, i, topics.length);
    results.push(result);
    
    // Пауза между запросами
    if (i < topics.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(''); // Пустая строка для читаемости
  }
  
  // Сохранение результатов
  const dataDir = ensureDataDir();
  const docsDir = ensureDocsDir();
  
  // JSON
  const jsonResult = {
    generatedAt: new Date().toISOString(),
    totalTopics: results.length,
    topicsWithChannels: results.filter(t => t.channelsFound > 0).length,
    topics: results
  };
  
  const jsonPath = path.join(dataDir, 'topic_channels_catalog.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonResult, null, 2), 'utf8');
  console.log(`💾 JSON сохранён: ${jsonPath}`);
  
  // Markdown
  const mdContent = generateMarkdownReport(results);
  const mdPath = path.join(docsDir, 'TOPIC_CATALOG.md');
  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log(`📄 Markdown сохранён: ${mdPath}`);
  
  // Итоговый отчёт
  console.log('\n📊 ИТОГОВЫЙ ОТЧЁТ:');
  console.log('='.repeat(50));
  console.log(`Всего тем: ${results.length}`);
  console.log(`Тем с каналами: ${results.filter(t => t.channelsFound > 0).length}`);
  console.log(`Тем с ТОП-5: ${results.filter(t => t.channelsFound >= 5).length}`);
  console.log(`Тем с ТОП-3: ${results.filter(t => t.channelsFound >= 3).length}`);
  console.log(`Тем с 1-2 каналами: ${results.filter(t => t.channelsFound > 0 && t.channelsFound < 3).length}`);
  console.log(`Тем без каналов: ${results.filter(t => t.channelsFound === 0).length}`);
  
  await client.disconnect();
  console.log('\n✅ Каталог тематик построен успешно!');
}

main().catch((e) => { 
  console.error('ОШИБКА ПОСТРОЕНИЯ КАТАЛОГА:', e?.message || e); 
  process.exit(1); 
});
