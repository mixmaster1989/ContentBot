require('dotenv').config();
const SmartGlobalSearch = require('./core/smart-global-search');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const fs = require('fs').promises;
const path = require('path');

class TradingStrategiesResearch {
  constructor() {
    // Меняем рабочую директорию как в проекте
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.smartSearch = new SmartGlobalSearch();
    
    // 100 ключевых слов для торговых стратегий
    this.keywords = [
      'торговые стратегии', 'вход в сделку', 'план сделки', 'риск-менеджмент', 'R:R',
      'сетап', 'точка входа', 'стоп-лосс', 'тейк-профит', 'частичная фиксация',
      'сопровождение позиции', 'перенос стопа', 'трейлинг-стоп', 'разбор сделок', 'дневник трейдера',
      'торговый план', 'сценарий', 'сетап дня', 'intraday', 'swing',
      'скальпинг', 'среднесрок', 'позиционная торговля', 'price action', 'уровни поддержки',
      'уровни сопротивления', 'пробой', 'ретест', 'отбой', 'ложный пробой',
      'паттерн', 'голова и плечи', 'двойная вершина', 'двойное дно', 'флаг',
      'вымпел', 'клин', 'треугольник', 'чашка с ручкой', 'inside bar',
      'pin bar', 'engulfing', 'поглощение', 'ордер-блок', 'ICT',
      'SMC', 'market structure', 'BOS', 'CHOCH', 'FVG',
      'liquidity grab', 'stop hunt', 'liquidity sweep', 'supply and demand', 'зона спроса',
      'зона предложения', 'дисбаланс', 'mitigation', 'premium discount', 'confluence',
      'многотаймфреймовость', 'топ-даун анализ', 'дневной байас', 'прошлый дневной хай лоу', 'недельные уровни',
      'азиатский диапазон', 'лондонская сессия', 'нью-йорк открытие', 'ORB', 'opening range breakout',
      'объем', 'VSA', 'orderflow', 'footprint', 'лента принтов',
      'стакан', 'volume profile', 'POC', 'VAH', 'VAL',
      'VWAP', 'ATR', 'волатильность', 'трендовая', 'контртренд',
      'mean reversion', 'breakout pullback continuation', 'momentum', 'дивергенция', 'коррекция',
      'EMA200 отбой', 'MA crossover', 'Bollinger squeeze', 'Keltner breakout', 'Donchian breakout',
      'Turtle strategy', 'Wyckoff', 'аккумуляция', 'дистрибуция', 'spring тест'
    ];
    
    this.resultsDir = '/home/user1/ContentBot/data/results';
    this.checkpointFile = path.join(this.resultsDir, 'checkpoint.json');
    this.allChannels = new Map();
    this.processedKeywords = 0;
    this.antilopaGroupId = -1002686615681;
  }

  async init() {
    try {
      console.log('🚀 Инициализация исследования торговых стратегий...');
      
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

  async researchTradingStrategies() {
    console.log(`🔍 Начинаю исследование по ${this.keywords.length} ключевым словам...`);
    
    // Отправляем стартовое сообщение
    await this.sendToAntilopa(`🚀 НАЧИНАЮ ИССЛЕДОВАНИЕ ТОРГОВЫХ СТРАТЕГИЙ\n\n📊 Ключевых слов: ${this.keywords.length}\n⏳ Ожидайте результатов...`);
    
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
        
        // Добавляем в общую коллекцию
        results.forEach(channel => {
          const key = channel.id || channel.title;
          if (!this.allChannels.has(key)) {
            this.allChannels.set(key, {
              ...channel,
              foundByKeywords: [keyword],
              totalScore: 0
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
          await this.sendToAntilopa(`📈 ПРОГРЕСС: ${this.processedKeywords}/${this.keywords.length} (${progress}%)\n\n📊 Найдено уникальных каналов: ${this.allChannels.size}\n⏳ Продолжаю исследование...`);
        }
        
        // Задержка между поисками
        await this.delay(2000);
        
      } catch (error) {
        console.error(`❌ Ошибка поиска по "${keyword}":`, error.message);
        continue;
      }
    }
    
    console.log(`\n🎯 ИССЛЕДОВАНИЕ ЗАВЕРШЕНО!`);
    console.log(`�� Найдено уникальных каналов: ${this.allChannels.size}`);
    
    // Сохраняем финальные результаты
    await this.saveFinalResults();
    
    // Находим ТОП-10 и чемпиона
    await this.findTop10AndChampion();
  }

  async saveFinalResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const results = Array.from(this.allChannels.values());
    
    // Сохраняем полные результаты
    const fullResultsFile = path.join(this.resultsDir, `trading_strategies_full_${timestamp}.json`);
    await fs.writeFile(fullResultsFile, JSON.stringify(results, null, 2));
    
    console.log(`💾 Полные результаты сохранены: ${fullResultsFile}`);
  }

  async findTop10AndChampion() {
    console.log('\n🏆 АНАЛИЗ ТОП-10 КАНАЛОВ...');
    
    // Фильтруем каналы с AI анализом и сортируем по рейтингу
    const channelsWithAI = Array.from(this.allChannels.values())
      .filter(channel => channel.aiAnalysis && !channel.aiAnalysis.error)
      .sort((a, b) => (b.aiAnalysis.qualityScore || 0) - (a.aiAnalysis.qualityScore || 0));
    
    const top10 = channelsWithAI.slice(0, 10);
    
    console.log(`📊 Найдено ${channelsWithAI.length} каналов с AI анализом`);
    console.log(`🏆 ТОП-10 каналов по AI рейтингу:`);
    
    // Отправляем ТОП-10 в АНТИЛОПУ
    let top10Message = `🏆 ТОП-10 КАНАЛОВ ПО ТОРГОВЫМ СТРАТЕГИЯМ\n\n`;
    
    top10.forEach((channel, index) => {
      const score = channel.aiAnalysis.qualityScore || 0;
      const emoji = score >= 8 ? '🌟' : score >= 6 ? '⭐' : '🔶';
      
      top10Message += `${index + 1}. ${emoji} ${channel.title}\n`;
      top10Message += `   👥 ${channel.participantsCount} участников\n`;
      top10Message += `   🧠 AI Рейтинг: ${score}/10\n`;
      top10Message += `   🎯 ${channel.aiAnalysis.verdict}\n`;
      if (channel.username) top10Message += `   🔗 @${channel.username}\n`;
      top10Message += `\n`;
      
      console.log(`${index + 1}. ${channel.title} - ${score}/10`);
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
    let championMessage = `👑 ЧЕМПИОН ТОРГОВЫХ СТРАТЕГИЙ\n\n`;
    championMessage += `🏆 ${champion.title}\n`;
    championMessage += `👥 ${champion.participantsCount} участников\n`;
    if (champion.username) championMessage += `🔗 @${champion.username}\n\n`;
    
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
    
    // Ключевые слова по которым найден
    championMessage += `🔍 НАЙДЕН ПО КЛЮЧЕВЫМ СЛОВАМ:\n`;
    championMessage += `${champion.foundByKeywords.slice(0, 10).join(', ')}`;
    if (champion.foundByKeywords.length > 10) {
      championMessage += ` и еще ${champion.foundByKeywords.length - 10}...`;
    }
    championMessage += `\n\n🎯 ИТОГ: Этот канал показал лучшие результаты по качеству контента и релевантности для изучения торговых стратегий!`;
    
    await this.sendToAntilopa(championMessage);
    
    // Сохраняем анализ чемпиона
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const championFile = path.join(this.resultsDir, `champion_analysis_${timestamp}.json`);
    await fs.writeFile(championFile, JSON.stringify({
      champion: champion,
      deepMetrics: deepMetrics,
      analysis: analysis
    }, null, 2));
    
    console.log(`💾 Анализ чемпиона сохранен: ${championFile}`);
    console.log(`\n🎉 ИССЛЕДОВАНИЕ ПОЛНОСТЬЮ ЗАВЕРШЕНО!`);
    
    // Отправляем финальное сообщение
    await this.sendToAntilopa(`🎉 ИССЛЕДОВАНИЕ ЗАВЕРШЕНО!\n\n📊 Проанализировано: ${this.allChannels.size} каналов\n🏆 Найден чемпион: ${champion.title}\n\n💾 Все результаты сохранены в файлы`);
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
  const research = new TradingStrategiesResearch();
  
  try {
    await research.init();
    await research.researchTradingStrategies();
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    await research.sendToAntilopa(`❌ ОШИБКА ИССЛЕДОВАНИЯ: ${error.message}`);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = TradingStrategiesResearch;
