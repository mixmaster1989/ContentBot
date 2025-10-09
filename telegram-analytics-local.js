require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

class TelegramAnalyticsLocal {
  constructor() {
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    
    // Словари для анализа
    this.politicalKeywords = {
      pro_russian: [
        'россия', 'путин', 'рф', 'российский', 'донбасс', 'лднр', 'новороссия',
        'денацификация', 'демилитаризация', 'спецоперация', 'освобождение',
        'братский народ', 'русский мир', 'антифашизм', 'победа'
      ],
      pro_western: [
        'украина', 'зеленский', 'нато', 'евросоюз', 'демократия', 'свобода',
        'европейские ценности', 'права человека', 'агрессия', 'оккупация',
        'война', 'вторжение', 'международное право', 'санкции'
      ],
      neutral: [
        'мир', 'переговоры', 'дипломатия', 'урегулирование', 'соглашение',
        'гуманитарный', 'беженцы', 'международный', 'объективно'
      ]
    };

    this.militaryTopics = {
      'военная техника': ['танк', 'самолет', 'ракета', 'дрон', 'вертолет', 'корабль', 'оружие', 'броня'],
      'военные операции': ['операция', 'наступление', 'оборона', 'атака', 'штурм', 'бомбардировка'],
      'конфликты': ['конфликт', 'война', 'сражение', 'бои', 'столкновение', 'противостояние'],
      'терроризм': ['террорист', 'теракт', 'взрыв', 'джихад', 'экстремизм'],
      'разведка': ['разведка', 'шпион', 'агент', 'данные', 'информация', 'секретно'],
      'оборона': ['пво', 'защита', 'оборона', 'укрепления', 'база']
    };

    this.entities = {
      countries: ['россия', 'украина', 'сша', 'китай', 'германия', 'франция', 'израиль', 'иран', 'турция', 'польша'],
      organizations: ['нато', 'цахал', 'фсб', 'цру', 'всу', 'рф', 'евросоюз'],
      politicians: ['путин', 'зеленский', 'байден', 'трамп', 'макрон', 'шольц', 'нетаньяху']
    };
  }

  async init() {
    try {
      await this.client.connect();
      console.log('✅ Local Analytics Platform запущена!');
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
    }
  }

  // 1. SENTIMENT ANALYSIS - Локальный анализ политической ориентации
  analyzeSentimentLocal(messages) {
    console.log('🎯 Локальный анализ политической ориентации...');
    
    let proRussianScore = 0;
    let proWesternScore = 0;
    let neutralScore = 0;
    
    const detectedKeywords = {
      pro_russian: [],
      pro_western: [],
      neutral: []
    };

    const allText = messages.map(m => m.text.toLowerCase()).join(' ');
    
    // Подсчет ключевых слов
    for (let [category, keywords] of Object.entries(this.politicalKeywords)) {
      for (let keyword of keywords) {
        const matches = (allText.match(new RegExp(keyword, 'g')) || []).length;
        if (matches > 0) {
          detectedKeywords[category].push({ keyword, count: matches });
          
          if (category === 'pro_russian') proRussianScore += matches;
          else if (category === 'pro_western') proWesternScore += matches;
          else neutralScore += matches;
        }
      }
    }

    const totalScore = proRussianScore + proWesternScore + neutralScore;
    let sentimentScore = 0;
    let orientation = 'нейтральный';
    
    if (totalScore > 0) {
      sentimentScore = Math.round(((proWesternScore - proRussianScore) / totalScore) * 100);
      
      if (sentimentScore > 20) orientation = 'прозападный';
      else if (sentimentScore < -20) orientation = 'пророссийский';
    }

    const confidence = totalScore > 10 ? 'высокая' : totalScore > 5 ? 'средняя' : 'низкая';

    return {
      sentiment_score: sentimentScore,
      orientation: orientation,
      confidence: confidence,
      pro_russian_mentions: proRussianScore,
      pro_western_mentions: proWesternScore,
      neutral_mentions: neutralScore,
      detected_keywords: detectedKeywords,
      total_political_keywords: totalScore,
      analysis_method: 'local_keyword_analysis'
    };
  }

  // 2. UNIQUENESS CALCULATOR - Локальный расчет уникальности
  calculateUniquenessLocal(channelMessages, competitorMessages = []) {
    console.log('🔍 Локальный анализ уникальности контента...');
    
    const channelText = channelMessages.map(m => m.text.toLowerCase()).join(' ');
    const competitorText = competitorMessages.map(m => m.text.toLowerCase()).join(' ');
    
    // Анализ тематического покрытия
    const channelTopics = {};
    const competitorTopics = {};
    
    for (let [topic, keywords] of Object.entries(this.militaryTopics)) {
      channelTopics[topic] = 0;
      competitorTopics[topic] = 0;
      
      for (let keyword of keywords) {
        channelTopics[topic] += (channelText.match(new RegExp(keyword, 'g')) || []).length;
        if (competitorText) {
          competitorTopics[topic] += (competitorText.match(new RegExp(keyword, 'g')) || []).length;
        }
      }
    }

    // Расчет уникальности тематик
    let uniqueTopics = 0;
    let totalTopics = 0;
    
    for (let topic of Object.keys(channelTopics)) {
      if (channelTopics[topic] > 0) {
        totalTopics++;
        if (competitorTopics[topic] === 0 || channelTopics[topic] > competitorTopics[topic] * 2) {
          uniqueTopics++;
        }
      }
    }

    const uniquenessScore = totalTopics > 0 ? Math.round((uniqueTopics / totalTopics) * 100) : 50;
    
    // Анализ частоты постинга
    const timeSpread = this.analyzePostingPattern(channelMessages);
    const contentFreshness = timeSpread.consistency_score;

    // Анализ длины и детализации постов
    const avgLength = channelMessages.reduce((sum, m) => sum + m.text.length, 0) / channelMessages.length;
    const detailScore = Math.min(Math.round((avgLength / 500) * 100), 100);

    return {
      uniqueness_score: uniquenessScore,
      content_freshness: contentFreshness,
      detail_score: detailScore,
      topics_covered: totalTopics,
      unique_topics: uniqueTopics,
      channel_topics: channelTopics,
      avg_post_length: Math.round(avgLength),
      posting_pattern: timeSpread,
      analysis_method: 'local_statistical_analysis'
    };
  }

  // 3. ENTITY EXTRACTION - Локальное извлечение сущностей
  extractEntitiesLocal(messages) {
    console.log('🏷️ Локальное извлечение сущностей...');
    
    const allText = messages.map(m => m.text.toLowerCase()).join(' ');
    const extractedEntities = {
      countries: [],
      organizations: [],
      politicians: []
    };

    // Поиск сущностей по словарям
    for (let [category, entityList] of Object.entries(this.entities)) {
      for (let entity of entityList) {
        const matches = (allText.match(new RegExp(entity, 'g')) || []).length;
        if (matches > 0) {
          extractedEntities[category].push({
            name: entity,
            count: matches,
            frequency: Math.round((matches / messages.length) * 100) / 100
          });
        }
      }
      
      // Сортируем по частоте
      extractedEntities[category].sort((a, b) => b.count - a.count);
    }

    // Определение основных тем
    const topicDistribution = {};
    for (let [topic, keywords] of Object.entries(this.militaryTopics)) {
      let topicCount = 0;
      for (let keyword of keywords) {
        topicCount += (allText.match(new RegExp(keyword, 'g')) || []).length;
      }
      if (topicCount > 0) {
        topicDistribution[topic] = topicCount;
      }
    }

    return {
      countries: extractedEntities.countries,
      organizations: extractedEntities.organizations,
      politicians: extractedEntities.politicians,
      topic_distribution: topicDistribution,
      most_mentioned_country: extractedEntities.countries[0]?.name || 'не определено',
      most_mentioned_politician: extractedEntities.politicians[0]?.name || 'не определено',
      total_entities: extractedEntities.countries.length + extractedEntities.organizations.length + extractedEntities.politicians.length,
      analysis_method: 'local_dictionary_matching'
    };
  }

  // 4. POSTING PATTERN ANALYSIS - Анализ паттернов публикации
  analyzePostingPattern(messages) {
    if (messages.length === 0) return { consistency_score: 0 };

    const hourlyDistribution = {};
    const dailyDistribution = {};
    
    messages.forEach(msg => {
      const hour = msg.date.getHours();
      const day = msg.date.toDateString();
      
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      dailyDistribution[day] = (dailyDistribution[day] || 0) + 1;
    });

    // Расчет консистентности
    const hourlyValues = Object.values(hourlyDistribution);
    const dailyValues = Object.values(dailyDistribution);
    
    const hourlyStdDev = this.calculateStdDev(hourlyValues);
    const dailyStdDev = this.calculateStdDev(dailyValues);
    
    const consistencyScore = Math.max(0, 100 - (hourlyStdDev + dailyStdDev) * 2);

    return {
      consistency_score: Math.round(consistencyScore),
      peak_hour: Object.keys(hourlyDistribution).reduce((a, b) => 
        hourlyDistribution[a] > hourlyDistribution[b] ? a : b
      ),
      avg_daily_posts: Math.round(messages.length / Object.keys(dailyDistribution).length),
      hourly_distribution: hourlyDistribution,
      posting_frequency: messages.length / Math.max(1, Object.keys(dailyDistribution).length)
    };
  }

  // Вспомогательные функции
  calculateStdDev(values) {
    if (values.length === 0) return 0;
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  async getChannelMessages(channelId, limit = 100) {
    try {
      const messages = await this.client.invoke(
        new Api.messages.GetHistory({
          peer: channelId,
          limit: limit,
          offsetDate: 0,
          offsetId: 0,
          maxId: 0,
          minId: 0,
          addOffset: 0,
          hash: 0n
        })
      );

      return messages.messages
        .filter(msg => msg.message && msg.message.length > 30)
        .map(msg => ({
          id: msg.id,
          text: msg.message,
          date: new Date(msg.date * 1000),
          views: msg.views || 0
        }));
    } catch (error) {
      console.error(`Ошибка получения сообщений канала ${channelId}:`, error);
      return [];
    }
  }

  // Сохранение результатов
  async saveAnalysis(data, filename) {
    try {
      const fs = require('fs').promises;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fullFilename = `${filename}_${timestamp}.json`;
      
      await fs.writeFile(fullFilename, JSON.stringify(data, null, 2), 'utf8');
      console.log(`💾 Анализ сохранен: ${fullFilename}`);
      
      return fullFilename;
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      return null;
    }
  }

  async close() {
    if (this.client) {
      await this.client.disconnect();
      console.log('🛑 Local Analytics Platform остановлена');
    }
  }
}

// Полный локальный анализ канала
async function fullLocalAnalysis(channelId, channelName) {
  const platform = new TelegramAnalyticsLocal();
  
  try {
    await platform.init();
    
    console.log(`🚀 ПОЛНЫЙ ЛОКАЛЬНЫЙ АНАЛИЗ КАНАЛА "${channelName}"`);
    console.log('=' .repeat(70));
    
    // Получаем сообщения
    const messages = await platform.getChannelMessages(channelId, 100);
    
    if (messages.length === 0) {
      console.log('❌ Сообщения не найдены');
      return;
    }

    console.log(`📊 Анализируем ${messages.length} сообщений`);
    console.log(`👀 Общие просмотры: ${messages.reduce((sum, m) => sum + m.views, 0).toLocaleString()}`);
    
    // 1. Политический анализ
    console.log('\n1️⃣ ПОЛИТИЧЕСКИЙ АНАЛИЗ');
    console.log('=' .repeat(40));
    const sentiment = platform.analyzeSentimentLocal(messages);
    console.log(`📊 Политическая ориентация: ${sentiment.orientation}`);
    console.log(`📈 Sentiment Score: ${sentiment.sentiment_score}`);
    console.log(`🎯 Уверенность: ${sentiment.confidence}`);
    console.log(`🔴 Пророссийские упоминания: ${sentiment.pro_russian_mentions}`);
    console.log(`🔵 Прозападные упоминания: ${sentiment.pro_western_mentions}`);
    console.log(`⚪ Нейтральные упоминания: ${sentiment.neutral_mentions}`);
    
    // 2. Анализ уникальности
    console.log('\n2️⃣ АНАЛИЗ УНИКАЛЬНОСТИ');
    console.log('=' .repeat(40));
    const uniqueness = platform.calculateUniquenessLocal(messages);
    console.log(`✨ Уникальность контента: ${uniqueness.uniqueness_score}%`);
    console.log(`🔄 Свежесть контента: ${uniqueness.content_freshness}%`);
    console.log(`📝 Детализация постов: ${uniqueness.detail_score}%`);
    console.log(`📋 Покрыто тематик: ${uniqueness.topics_covered}`);
    console.log(`🎯 Уникальных тематик: ${uniqueness.unique_topics}`);
    console.log(`📏 Средняя длина поста: ${uniqueness.avg_post_length} символов`);
    
    // 3. Извлечение сущностей
    console.log('\n3️⃣ ИЗВЛЕЧЕНИЕ СУЩНОСТЕЙ');
    console.log('=' .repeat(40));
    const entities = platform.extractEntitiesLocal(messages);
    console.log(`🌍 Упомянуто стран: ${entities.countries.length}`);
    console.log(`🏢 Упомянуто организаций: ${entities.organizations.length}`);
    console.log(`👤 Упомянуто политиков: ${entities.politicians.length}`);
    console.log(`🎯 Самая упоминаемая страна: ${entities.most_mentioned_country}`);
    console.log(`👑 Самый упоминаемый политик: ${entities.most_mentioned_politician}`);
    
    if (entities.countries.length > 0) {
      console.log('\n🌍 ТОП-5 СТРАН:');
      entities.countries.slice(0, 5).forEach((country, i) => {
        console.log(`   ${i+1}. ${country.name}: ${country.count} упоминаний`);
      });
    }
    
    // 4. Паттерны публикации
    console.log('\n4️⃣ ПАТТЕРНЫ ПУБЛИКАЦИИ');
    console.log('=' .repeat(40));
    const patterns = platform.analyzePostingPattern(messages);
    console.log(`⏰ Пик активности: ${patterns.peak_hour}:00`);
    console.log(`📅 Постов в день: ${patterns.avg_daily_posts}`);
    console.log(`🔄 Консистентность: ${patterns.consistency_score}%`);
    console.log(`📊 Частота: ${patterns.posting_frequency.toFixed(1)} постов/день`);
    
    // Итоговая оценка
    const overallScore = Math.round((
      (sentiment.sentiment_score + 50) * 0.2 +
      uniqueness.uniqueness_score * 0.3 +
      uniqueness.content_freshness * 0.2 +
      patterns.consistency_score * 0.2 +
      Math.min(entities.total_entities * 5, 100) * 0.1
    ));
    
    console.log('\n' .repeat(2) + '🏆 ИТОГОВАЯ ОЦЕНКА');
    console.log('=' .repeat(50));
    console.log(`📊 Общий рейтинг канала: ${overallScore}/100`);
    
    let rating = 'Низкий';
    if (overallScore >= 80) rating = 'Отличный';
    else if (overallScore >= 60) rating = 'Хороший';
    else if (overallScore >= 40) rating = 'Средний';
    
    console.log(`⭐ Класс канала: ${rating}`);
    
    // Сохраняем результаты
    const fullAnalysis = {
      channel_name: channelName,
      channel_id: channelId,
      messages_analyzed: messages.length,
      analysis_date: new Date().toISOString(),
      overall_score: overallScore,
      rating: rating,
      sentiment_analysis: sentiment,
      uniqueness_analysis: uniqueness,
      entities_analysis: entities,
      posting_patterns: patterns
    };
    
    await platform.saveAnalysis(fullAnalysis, 'full_local_analysis');
    console.log('\n✅ АНАЛИЗ ЗАВЕРШЕН И СОХРАНЕН!');
    
  } catch (error) {
    console.error('❌ Ошибка анализа:', error);
  } finally {
    await platform.close();
  }
}

// Экспорт
module.exports = { TelegramAnalyticsLocal, fullLocalAnalysis };

// Запуск если файл вызван напрямую
if (require.main === module) {
  // Анализ канала "Милитарист"
  fullLocalAnalysis(-1001111348665, "Милитарист");
}
