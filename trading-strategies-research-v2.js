require('dotenv').config();
const SmartGlobalSearch = require('./core/smart-global-search');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const fs = require('fs').promises;
const path = require('path');

class TradingStrategiesResearchV2 {
  constructor() {
    // Меняем рабочую директорию как в проекте
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.smartSearch = new SmartGlobalSearch();
    
    // 1. УТОЧНЕННЫЕ ключевые слова с контекстом трейдинга
    this.keywords = [
      'торговые стратегии трейдинг', 'вход в сделку форекс', 'план сделки крипто', 'риск-менеджмент трейдинг', 'R:R форекс',
      'сетап трейдинг', 'точка входа форекс', 'стоп-лосс трейдинг', 'тейк-профит крипто', 'частичная фиксация трейдинг',
      'сопровождение позиции форекс', 'перенос стопа трейдинг', 'трейлинг-стоп крипто', 'разбор сделок трейдинг', 'дневник трейдера форекс',
      'торговый план крипто', 'сценарий трейдинг', 'сетап дня форекс', 'intraday трейдинг', 'swing торговля',
      'скальпинг форекс', 'среднесрок трейдинг', 'позиционная торговля крипто', 'price action форекс', 'уровни поддержки трейдинг',
      'уровни сопротивления форекс', 'пробой трейдинг', 'ретест крипто', 'отбой форекс', 'ложный пробой трейдинг',
      'паттерн форекс', 'голова и плечи трейдинг', 'двойная вершина крипто', 'двойное дно форекс', 'флаг трейдинг',
      'вымпел крипто', 'клин форекс', 'треугольник трейдинг', 'чашка с ручкой крипто', 'inside bar форекс',
      'pin bar трейдинг', 'engulfing крипто', 'поглощение форекс', 'ордер-блок трейдинг', 'ICT форекс',
      'SMC трейдинг', 'market structure крипто', 'BOS форекс', 'CHOCH трейдинг', 'FVG крипто',
      'liquidity grab форекс', 'stop hunt трейдинг', 'liquidity sweep крипто', 'supply and demand форекс', 'зона спроса трейдинг',
      'зона предложения крипто', 'дисбаланс форекс', 'mitigation трейдинг', 'premium discount крипто', 'confluence форекс',
      'многотаймфреймовость трейдинг', 'топ-даун анализ форекс', 'дневной байас крипто', 'прошлый дневной хай лоу форекс', 'недельные уровни трейдинг',
      'азиатский диапазон крипто', 'лондонская сессия форекс', 'нью-йорк открытие трейдинг', 'ORB крипто', 'opening range breakout форекс',
      'объем трейдинг', 'VSA форекс', 'orderflow крипто', 'footprint трейдинг', 'лента принтов форекс',
      'стакан крипто', 'volume profile трейдинг', 'POC форекс', 'VAH крипто', 'VAL трейдинг',
      'VWAP форекс', 'ATR трейдинг', 'волатильность крипто', 'трендовая форекс', 'контртренд трейдинг',
      'mean reversion крипто', 'breakout pullback continuation форекс', 'momentum трейдинг', 'дивергенция крипто', 'коррекция форекс',
      'EMA200 отбой трейдинг', 'MA crossover крипто', 'Bollinger squeeze форекс', 'Keltner breakout трейдинг', 'Donchian breakout крипто',
      'Turtle strategy форекс', 'Wyckoff трейдинг', 'аккумуляция крипто', 'дистрибуция форекс', 'spring тест трейдинг',
      // Дополнительные специфичные термины
      'торговые сигналы форекс', 'разбор сделок трейдинг', 'анализ рынка крипто', 'технический анализ форекс',
      'фундаментальный анализ трейдинг', 'торговые идеи крипто', 'прогнозы форекс', 'торговые рекомендации трейдинг'
    ];
    
    this.resultsDir = '/home/user1/ContentBot/data/results';
    this.checkpointFile = path.join(this.resultsDir, 'checkpoint_v2.json');
    this.allChannels = new Map();
    this.processedKeywords = 0;
    this.antilopaGroupId = -1002686615681;
    
    // 3. Фильтры для пост-фильтрации
    this.tradingKeywords = ['трейдинг', 'форекс', 'крипто', 'биржа', 'торговля', 'сделка', 'позиция', 'актив', 'валют', 'инвестиц', 'спекуляц', 'анализ рынка', 'торговые сигналы', 'разбор сделок'];
    this.excludeKeywords = ['ваканс', 'работа', 'музык', 'дизайн', 'сценари', 'сторис', 'реелс', 'программирован', 'IT', 'разработк', 'код', 'музыкальн', 'творческ', 'креатив'];
  }

  async init() {
    try {
      console.log('🚀 Инициализация улучшенного исследования торговых стратегий...');
      
      // Создаем директорию результатов
      await fs.mkdir(this.resultsDir, { recursive: true });
      
      await this.mt.start();
      console.log('✅ MTProto клиент подключен');
      
      await this.smartSearch.init(this.client);
      console.log('✅ SmartGlobalSearch инициализирован');
      
      // Загружаем чекпоинт если есть
      await this.loadCheckpoint();
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async loadCheckpoint() {
    try {
      const data = await fs.readFile(this.checkpointFile, 'utf8');
      const checkpoint = JSON.parse(data);
      this.processedKeywords = checkpoint.processedKeywords || 0;
      
      if (checkpoint.allChannels) {
        this.allChannels = new Map(Object.entries(checkpoint.allChannels));
      }
      
      console.log(`📊 Загружен чекпоинт: ${this.processedKeywords}/${this.keywords.length} ключевых слов`);
    } catch (error) {
      console.log('📝 Чекпоинт не найден, начинаем с нуля');
    }
  }

  async saveCheckpoint() {
    const checkpoint = {
      processedKeywords: this.processedKeywords,
      allChannels: Object.fromEntries(this.allChannels),
      timestamp: new Date().toISOString()
    };
    
    await fs.writeFile(this.checkpointFile, JSON.stringify(checkpoint, null, 2));
  }

  async sendToAntilopa(message) {
    try {
      await this.client.sendMessage(this.antilopaGroupId, { message });
      console.log('✅ Сообщение отправлено в АНТИЛОПУ');
    } catch (error) {
      console.error('❌ Ошибка отправки в АНТИЛОПУ:', error);
    }
  }

  // 4. Улучшенная пост-фильтрация
  isTradingRelevant(channel) {
    const title = (channel.title || '').toLowerCase();
    const description = (channel.description || '').toLowerCase();
    const text = `${title} ${description}`;
    
    // Проверяем наличие торговых терминов
    const hasTradingKeywords = this.tradingKeywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    // Проверяем отсутствие исключающих терминов
    const hasExcludeKeywords = this.excludeKeywords.some(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    // Дополнительная проверка по AI анализу
    const aiRelevant = channel.aiAnalysis && 
      (channel.aiAnalysis.categories || []).some(cat => 
        ['трейдинг', 'форекс', 'крипто', 'финансы', 'инвестиции'].some(tradingCat =>
          cat.toLowerCase().includes(tradingCat)
        )
      );
    
    return hasTradingKeywords && !hasExcludeKeywords && (aiRelevant || !channel.aiAnalysis);
  }

  async researchTradingStrategies() {
    console.log(`🔍 Начинаю улучшенное исследование по ${this.keywords.length} ключевым словам...`);
    
    // Отправляем стартовое сообщение
    await this.sendToAntilopa(`🚀 УЛУЧШЕННОЕ ИССЛЕДОВАНИЕ ТОРГОВЫХ СТРАТЕГИЙ\n\n📊 Ключевых слов: ${this.keywords.length}\n🔧 Улучшения: уточненные запросы + фильтрация + AI контекст\n⏳ Ожидайте результатов...`);
    
    for (let i = this.processedKeywords; i < this.keywords.length; i++) {
      const keyword = this.keywords[i];
      
      try {
        console.log(`\n📊 [${i+1}/${this.keywords.length}] Поиск по: "${keyword}"`);
        
        // Поиск с AI анализом
        const results = await this.smartSearch.smartSearch(keyword, {
          limit: 5,
          aiAnalysisLimit: 2,
          analysisDelay: 0
        });
        
        console.log(`✅ Найдено ${results.length} каналов`);
        
        // 4. Применяем пост-фильтрацию
        const filteredResults = results.filter(channel => this.isTradingRelevant(channel));
        console.log(`🎯 После фильтрации: ${filteredResults.length} релевантных каналов`);
        
        // Добавляем в общую коллекцию
        filteredResults.forEach(channel => {
          const key = channel.id || channel.title;
          if (!this.allChannels.has(key)) {
            this.allChannels.set(key, {
              ...channel,
              foundByKeywords: [keyword],
              totalScore: 0,
              relevanceScore: this.calculateRelevanceScore(channel)
            });
          } else {
            const existing = this.allChannels.get(key);
            if (!existing.foundByKeywords.includes(keyword)) {
              existing.foundByKeywords.push(keyword);
            }
          }
        });
        
        this.processedKeywords = i + 1;
        
        // Сохраняем чекпоинт каждые 10 ключевых слов
        if (this.processedKeywords % 10 === 0) {
          await this.saveCheckpoint();
          
          // Отправляем промежуточный отчет
          const progress = Math.round((this.processedKeywords / this.keywords.length) * 100);
          const relevantChannels = Array.from(this.allChannels.values()).filter(ch => this.isTradingRelevant(ch)).length;
          await this.sendToAntilopa(`📈 ПРОГРЕСС: ${this.processedKeywords}/${this.keywords.length} (${progress}%)\n\n📊 Найдено релевантных каналов: ${relevantChannels}\n⏳ Продолжаю исследование...`);
        }
        
        // Задержка между поисками
        await this.delay(2000);
        
      } catch (error) {
        console.error(`❌ Ошибка поиска по "${keyword}":`, error.message);
        continue;
      }
    }
    
    console.log(`\n🎯 ИССЛЕДОВАНИЕ ЗАВЕРШЕНО!`);
    const relevantChannels = Array.from(this.allChannels.values()).filter(ch => this.isTradingRelevant(ch));
    console.log(`📊 Найдено релевантных каналов: ${relevantChannels.length}`);
    
    // Сохраняем финальные результаты
    await this.saveFinalResults();
    
    // Находим ТОП-10 и чемпиона
    await this.findTop10AndChampion();
  }

  calculateRelevanceScore(channel) {
    let score = 0;
    const text = `${channel.title || ''} ${channel.description || ''}`.toLowerCase();
    
    // Бонус за торговые термины в названии
    this.tradingKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 2;
      }
    });
    
    // Бонус за AI анализ
    if (channel.aiAnalysis && !channel.aiAnalysis.error) {
      score += channel.aiAnalysis.qualityScore || 0;
      
      // Дополнительный бонус за торговые категории
      if (channel.aiAnalysis.categories) {
        const tradingCats = ['трейдинг', 'форекс', 'крипто', 'финансы', 'инвестиции'];
        tradingCats.forEach(cat => {
          if (channel.aiAnalysis.categories.some(aiCat => aiCat.toLowerCase().includes(cat))) {
            score += 3;
          }
        });
      }
    }
    
    return score;
  }

  async saveFinalResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const allResults = Array.from(this.allChannels.values());
    const relevantResults = allResults.filter(ch => this.isTradingRelevant(ch));
    
    // Сохраняем только релевантные результаты
    const relevantResultsFile = path.join(this.resultsDir, `trading_strategies_relevant_${timestamp}.json`);
    await fs.writeFile(relevantResultsFile, JSON.stringify(relevantResults, null, 2));
    
    // Сохраняем полные результаты
    const fullResultsFile = path.join(this.resultsDir, `trading_strategies_full_v2_${timestamp}.json`);
    await fs.writeFile(fullResultsFile, JSON.stringify(allResults, null, 2));
    
    console.log(`💾 Релевантные результаты сохранены: ${relevantResultsFile}`);
    console.log(`💾 Полные результаты сохранены: ${fullResultsFile}`);
  }

  async findTop10AndChampion() {
    console.log('\n🏆 АНАЛИЗ ТОП-10 РЕЛЕВАНТНЫХ КАНАЛОВ...');
    
    // Фильтруем только релевантные каналы с AI анализом и сортируем по релевантности
    const relevantChannelsWithAI = Array.from(this.allChannels.values())
      .filter(channel => this.isTradingRelevant(channel) && channel.aiAnalysis && !channel.aiAnalysis.error)
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    const top10 = relevantChannelsWithAI.slice(0, 10);
    
    console.log(`📊 Найдено ${relevantChannelsWithAI.length} релевантных каналов с AI анализом`);
    console.log(`🏆 ТОП-10 релевантных каналов по рейтингу релевантности:`);
    
    // Отправляем ТОП-10 в АНТИЛОПУ
    let top10Message = `🏆 ТОП-10 РЕЛЕВАНТНЫХ КАНАЛОВ ПО ТОРГОВЫМ СТРАТЕГИЯМ\n\n`;
    
    top10.forEach((channel, index) => {
      const score = channel.relevanceScore || 0;
      const aiScore = channel.aiAnalysis.qualityScore || 0;
      const emoji = score >= 15 ? '🌟' : score >= 10 ? '⭐' : '🔶';
      
      top10Message += `${index + 1}. ${emoji} ${channel.title}\n`;
      top10Message += `   👥 ${channel.participantsCount} участников\n`;
      top10Message += `   🎯 Релевантность: ${score.toFixed(1)}\n`;
      top10Message += `   🧠 AI Рейтинг: ${aiScore}/10\n`;
      top10Message += `   🎯 ${channel.aiAnalysis.verdict}\n`;
      if (channel.username) top10Message += `   🔗 @${channel.username}\n`;
      top10Message += `\n`;
      
      console.log(`${index + 1}. ${channel.title} - Релевантность: ${score.toFixed(1)}, AI: ${aiScore}/10`);
    });
    
    await this.sendToAntilopa(top10Message);
    
    // Глубокий анализ чемпиона
    if (top10.length > 0) {
      await this.analyzeChampion(top10[0]);
    }
  }

  async analyzeChampion(champion) {
    console.log(`\n👑 ГЛУБОКИЙ АНАЛИЗ ЧЕМПИОНА: ${champion.title}`);
    
    // Собираем дополнительные метрики
    const deepMetrics = await this.collectDeepMetrics(champion);
    
    // Формируем развернутый анализ
    let championMessage = `👑 ЧЕМПИОН ТОРГОВЫХ СТРАТЕГИЙ (УЛУЧШЕННАЯ ВЕРСИЯ)\n\n`;
    championMessage += `🏆 ${champion.title}\n`;
    championMessage += `👥 ${champion.participantsCount} участников\n`;
    if (champion.username) championMessage += `🔗 @${champion.username}\n\n`;
    
    // Релевантность
    championMessage += `🎯 РЕЛЕВАНТНОСТЬ: ${champion.relevanceScore?.toFixed(1) || 0}\n`;
    championMessage += `📝 Найден по ключевым словам: ${champion.foundByKeywords.slice(0, 5).join(', ')}\n\n`;
    
    // AI анализ
    const analysis = champion.aiAnalysis;
    championMessage += `🧠 AI АНАЛИЗ:\n`;
    championMessage += `⭐ Рейтинг качества: ${analysis.qualityScore}/10\n`;
    championMessage += `📚 Образовательная ценность: ${analysis.educationalValue}/10\n`;
    championMessage += `💰 Коммерческий индекс: ${analysis.commercialIndex}/10\n`;
    championMessage += `📝 Тип контента: ${analysis.contentType}\n`;
    championMessage += `👥 Целевая аудитория: ${analysis.targetAudience}\n`;
    championMessage += `🎯 Вердикт: ${analysis.verdict}\n`;
    championMessage += `💭 Рекомендация: ${analysis.recommendation}\n\n`;
    
    // Дополнительные метрики
    if (deepMetrics) {
      championMessage += `📊 ДОПОЛНИТЕЛЬНЫЕ МЕТРИКИ:\n`;
      championMessage += `📝 Постов проанализировано: ${deepMetrics.postsAnalyzed || 0}\n`;
      championMessage += `📈 Постов в день: ${deepMetrics.avgPostsPerDay?.toFixed(1) || 0}\n`;
      championMessage += `👀 Средние просмотры: ${deepMetrics.avgViewsPerPost || 0}\n`;
      championMessage += `❤️ Средние реакции: ${deepMetrics.avgReactionsPerPost || 0}\n`;
      championMessage += `📏 Средняя длина поста: ${deepMetrics.avgPostLength || 0} символов\n`;
      championMessage += `🖼️ Медиа контент: ${deepMetrics.mediaPercentage || 0}%\n\n`;
    }
    
    championMessage += `🎯 ИТОГ: Этот канал показал лучшие результаты по релевантности и качеству контента для изучения торговых стратегий!`;
    
    await this.sendToAntilopa(championMessage);
    
    // Сохраняем анализ чемпиона
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const championFile = path.join(this.resultsDir, `champion_analysis_v2_${timestamp}.json`);
    await fs.writeFile(championFile, JSON.stringify({
      champion: champion,
      deepMetrics: deepMetrics,
      analysis: analysis,
      relevanceScore: champion.relevanceScore
    }, null, 2));
    
    console.log(`💾 Анализ чемпиона сохранен: ${championFile}`);
    console.log(`\n🎉 УЛУЧШЕННОЕ ИССЛЕДОВАНИЕ ПОЛНОСТЬЮ ЗАВЕРШЕНО!`);
    
    // Отправляем финальное сообщение
    const relevantCount = Array.from(this.allChannels.values()).filter(ch => this.isTradingRelevant(ch)).length;
    await this.sendToAntilopa(`🎉 УЛУЧШЕННОЕ ИССЛЕДОВАНИЕ ЗАВЕРШЕНО!\n\n📊 Проанализировано: ${this.allChannels.size} каналов\n🎯 Релевантных найдено: ${relevantCount}\n🏆 Найден чемпион: ${champion.title}\n\n💾 Все результаты сохранены в файлы`);
  }

  async collectDeepMetrics(channel) {
    try {
      // Используем существующие метрики из AI анализа
      return channel.metrics || {};
    } catch (error) {
      console.error('❌ Ошибка сбора дополнительных метрик:', error);
      return {};
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const research = new TradingStrategiesResearchV2();
  
  try {
    await research.init();
    await research.researchTradingStrategies();
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    await research.sendToAntilopa(`❌ ОШИБКА УЛУЧШЕННОГО ИССЛЕДОВАНИЯ: ${error.message}`);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = TradingStrategiesResearchV2;
