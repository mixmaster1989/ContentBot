// Улучшенное построение каталога тематик с множественными запросами и синонимами
const fs = require('fs');
const path = require('path');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

function readConfig() {
  const configPath = path.join(__dirname, '../data/topic_catalog_config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

function readSynonyms() {
  const synonymsPath = path.join(__dirname, '../data/topic_synonyms.json');
  const raw = fs.readFileSync(synonymsPath, 'utf8');
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

async function findTopChannelsImproved(client, searchQueries, minParticipants = 50, maxResults = 5) {
  const allChannels = new Map(); // Используем Map для дедупликации по ID
  
  for (const query of searchQueries) {
    try {
      console.log(`    🔍 Поиск: "${query}"`);
      
      const search = await client.invoke(new Api.contacts.Search({ 
        q: query, 
        limit: 100 // Увеличили лимит
      }));
      
      const channels = (search.chats || [])
        .filter((c) => c.className === 'Channel')
        .filter(ch => (ch.participantsCount || 0) >= minParticipants);
      
      // Добавляем в Map, избегая дубликатов
      channels.forEach(ch => {
        const channelId = ch.id.toString();
        if (!allChannels.has(channelId)) {
          allChannels.set(channelId, {
            id: channelId,
            title: ch.title || 'Без названия',
            username: ch.username || null,
            participants: ch.participantsCount || 0,
            foundBy: query
          });
        }
      });
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`    ❌ Ошибка поиска "${query}":`, error.message);
      // Продолжаем с другими запросами
    }
  }
  
  // Сортируем по количеству участников и возвращаем топ
  return Array.from(allChannels.values())
    .sort((a, b) => b.participants - a.participants)
    .slice(0, maxResults);
}

async function getFullChannelInfo(client, channelId) {
  try {
    const fullInfo = await client.invoke(new Api.channels.GetFullChannel({
      channel: channelId
    }));
    return fullInfo.fullChat?.participantsCount || 0;
  } catch (error) {
    console.error(`    ⚠️ Не удалось получить полную информацию для канала ${channelId}:`, error.message);
    return 0;
  }
}

async function processTopicImproved(client, topic, synonyms, index, total) {
  console.log(`[${index + 1}/${total}] Обрабатываю: ${topic.name}`);
  
  // Получаем синонимы для темы
  const topicSynonyms = synonyms.synonyms[topic.id] || [topic.searchQuery];
  console.log(`  📝 Запросы: ${topicSynonyms.length}`);
  
  const channels = await findTopChannelsImproved(client, topicSynonyms, 50, 5);
  
  // Дополняем информацию о каналах, если нужно
  const enrichedChannels = [];
  for (const channel of channels) {
    if (channel.participants === 0) {
      // Пытаемся получить точное количество участников
      const fullParticipants = await getFullChannelInfo(client, channel.id);
      channel.participants = fullParticipants;
    }
    enrichedChannels.push(channel);
  }
  
  const result = {
    ...topic,
    searchQueries: topicSynonyms,
    channelsFound: enrichedChannels.length,
    channels: enrichedChannels,
    processedAt: new Date().toISOString()
  };
  
  if (enrichedChannels.length === 0) {
    console.log(`  ❌ Каналы не найдены`);
  } else if (enrichedChannels.length < 3) {
    console.log(`  ⚠️  Найдено только ${enrichedChannels.length} каналов (меньше 3)`);
  } else if (enrichedChannels.length < 5) {
    console.log(`  ✅ Найдено ${enrichedChannels.length} каналов (меньше 5, но больше 3)`);
  } else {
    console.log(`  ✅ Найдено ${enrichedChannels.length} каналов (ТОП-5)`);
  }
  
  // Показываем найденные каналы
  enrichedChannels.forEach((ch, i) => {
    console.log(`    ${i + 1}. ${ch.title} (${ch.participants} участников) [${ch.foundBy}]`);
  });
  
  return result;
}

function generateMarkdownReportImproved(results) {
  const categories = {};
  
  // Группируем по категориям
  results.forEach(topic => {
    if (!categories[topic.category]) {
      categories[topic.category] = [];
    }
    categories[topic.category].push(topic);
  });
  
  let md = `# Каталог тематик ContentBot (Улучшенная версия)\n\n`;
  md += `**Сгенерировано:** ${new Date().toLocaleString('ru-RU')}\n\n`;
  md += `**Всего тем:** ${results.length}\n`;
  md += `**Тем с каналами:** ${results.filter(t => t.channelsFound > 0).length}\n`;
  md += `**Тем с ТОП-5:** ${results.filter(t => t.channelsFound >= 5).length}\n`;
  md += `**Тем с ТОП-3:** ${results.filter(t => t.channelsFound >= 3).length}\n\n`;
  
  // Таблица по категориям
  Object.keys(categories).sort().forEach(category => {
    md += `## ${category}\n\n`;
    md += `| Тема | Найдено | ТОП-3 канала | Запросы |\n`;
    md += `|------|---------|-------------|----------|\n`;
    
    categories[category].forEach(topic => {
      const top3 = topic.channels.slice(0, 3);
      const channelNames = top3.length > 0 
        ? top3.map(ch => ch.title).join(', ')
        : 'Не найдены';
      
      const status = topic.channelsFound === 0 ? '❌' : 
                    topic.channelsFound < 3 ? '⚠️' : '✅';
      
      const queries = topic.searchQueries ? topic.searchQueries.length : 1;
      
      md += `| ${status} ${topic.name} | ${topic.channelsFound} | ${channelNames} | ${queries} |\n`;
    });
    
    md += `\n`;
  });
  
  // Предупреждения
  const problematic = results.filter(t => t.channelsFound < 3);
  if (problematic.length > 0) {
    md += `## ⚠️ Темы с недостаточным количеством каналов\n\n`;
    md += `| Тема | Найдено | Категория | Запросы |\n`;
    md += `|------|---------|----------|----------|\n`;
    
    problematic.forEach(topic => {
      const queries = topic.searchQueries ? topic.searchQueries.length : 1;
      md += `| ${topic.name} | ${topic.channelsFound} | ${topic.category} | ${queries} |\n`;
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
  
  // Улучшения
  md += `## Улучшения в этой версии\n\n`;
  md += `- Увеличен лимит поиска до 100 результатов\n`;
  md += `- Добавлены синонимы и множественные запросы\n`;
  md += `- Снижен порог участников до 50\n`;
  md += `- Дедупликация каналов по ID\n`;
  md += `- Дополнительная информация о каналах\n\n`;
  
  return md;
}

async function main() {
  console.log('🚀 Запуск улучшенного построения каталога тематик...\n');
  
  // Подключение к MTProto
  const mt = MTProtoClient.get();
  const client = mt.getClient();
  await client.connect();
  console.log('✅ Подключение к Telegram установлено\n');
  
  // Чтение конфигов
  const config = readConfig();
  const synonyms = readSynonyms();
  const topics = config.topics;
  console.log(`📋 Загружено ${topics.length} тематик\n`);
  console.log(`📚 Загружено синонимов для ${Object.keys(synonyms.synonyms).length} тем\n`);
  
  // Обработка каждой темы
  const results = [];
  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    const result = await processTopicImproved(client, topic, synonyms, i, topics.length);
    results.push(result);
    
    // Пауза между темами
    if (i < topics.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(''); // Пустая строка для читаемости
  }
  
  // Сохранение результатов
  const dataDir = ensureDataDir();
  const docsDir = ensureDocsDir();
  
  // JSON
  const jsonResult = {
    generatedAt: new Date().toISOString(),
    version: 'improved',
    totalTopics: results.length,
    topicsWithChannels: results.filter(t => t.channelsFound > 0).length,
    topics: results
  };
  
  const jsonPath = path.join(dataDir, 'topic_channels_catalog_improved.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonResult, null, 2), 'utf8');
  console.log(`💾 JSON сохранён: ${jsonPath}`);
  
  // Markdown
  const mdContent = generateMarkdownReportImproved(results);
  const mdPath = path.join(docsDir, 'TOPIC_CATALOG_IMPROVED.md');
  fs.writeFileSync(mdPath, mdContent, 'utf8');
  console.log(`📄 Markdown сохранён: ${mdPath}`);
  
  // Итоговый отчёт
  console.log('\n📊 ИТОГОВЫЙ ОТЧЁТ (УЛУЧШЕННАЯ ВЕРСИЯ):');
  console.log('='.repeat(60));
  console.log(`Всего тем: ${results.length}`);
  console.log(`Тем с каналами: ${results.filter(t => t.channelsFound > 0).length}`);
  console.log(`Тем с ТОП-5: ${results.filter(t => t.channelsFound >= 5).length}`);
  console.log(`Тем с ТОП-3: ${results.filter(t => t.channelsFound >= 3).length}`);
  console.log(`Тем с 1-2 каналами: ${results.filter(t => t.channelsFound > 0 && t.channelsFound < 3).length}`);
  console.log(`Тем без каналов: ${results.filter(t => t.channelsFound === 0).length}`);
  
  // Сравнение с предыдущей версией
  const oldResultsPath = path.join(dataDir, 'topic_channels_catalog.json');
  if (fs.existsSync(oldResultsPath)) {
    const oldData = JSON.parse(fs.readFileSync(oldResultsPath, 'utf8'));
    console.log('\n📈 СРАВНЕНИЕ С ПРЕДЫДУЩЕЙ ВЕРСИЕЙ:');
    console.log('='.repeat(60));
    console.log(`Тем с каналами: ${oldData.topicsWithChannels} → ${results.filter(t => t.channelsFound > 0).length}`);
    console.log(`Тем с ТОП-5: ${oldData.topics.filter(t => t.channelsFound >= 5).length} → ${results.filter(t => t.channelsFound >= 5).length}`);
    console.log(`Тем с ТОП-3: ${oldData.topics.filter(t => t.channelsFound >= 3).length} → ${results.filter(t => t.channelsFound >= 3).length}`);
  }
  
  await client.disconnect();
  console.log('\n✅ Улучшенный каталог тематик построен успешно!');
}

main().catch((e) => { 
  console.error('ОШИБКА ПОСТРОЕНИЯ УЛУЧШЕННОГО КАТАЛОГА:', e?.message || e); 
  process.exit(1); 
});

