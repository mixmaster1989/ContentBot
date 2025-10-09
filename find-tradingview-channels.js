require('dotenv').config();
const SmartGlobalSearch = require('./core/smart-global-search');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');

class TradingViewChannelsFinder {
  constructor() {
    // Меняем рабочую директорию как в проекте
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.smartSearch = new SmartGlobalSearch();
    
    // 100 релевантных слов для поиска ТВ индикаторов
    this.tradingViewKeywords = [
      // Основные индикаторы
      'RSI', 'MACD', 'Bollinger Bands', 'Moving Average', 'SMA', 'EMA', 'WMA',
      'Stochastic', 'Williams %R', 'CCI', 'ATR', 'ADX', 'Parabolic SAR',
      'Ichimoku', 'Fibonacci', 'Pivot Points', 'Support Resistance',
      
      // Трейдинг термины
      'TradingView', 'Trading Signals', 'Technical Analysis', 'Chart Patterns',
      'Candlestick', 'Volume Profile', 'Order Flow', 'Market Structure',
      'Trend Lines', 'Channel', 'Triangle', 'Head Shoulders', 'Double Top',
      'Flag Pattern', 'Pennant', 'Wedge', 'Cup Handle',
      
      // Индикаторы волатильности
      'Volatility', 'VIX', 'BB Squeeze', 'Keltner Channel', 'Donchian Channel',
      'Standard Deviation', 'Average True Range', 'Volatility Index',
      
      // Объемные индикаторы
      'Volume', 'OBV', 'Volume Weighted', 'Money Flow', 'Accumulation Distribution',
      'Chaikin Oscillator', 'Volume Rate', 'Ease of Movement',
      
      // Моментум индикаторы
      'Momentum', 'Rate of Change', 'ROC', 'Commodity Channel Index',
      'Relative Strength', 'Price Oscillator', 'Ultimate Oscillator',
      
      // Осцилляторы
      'Oscillator', 'MACD Histogram', 'MACD Signal', 'MACD Line',
      'Stochastic %K', 'Stochastic %D', 'Williams %R', 'RSI Divergence',
      
      // Скользящие средние
      'MA Crossover', 'Golden Cross', 'Death Cross', 'MA Ribbon',
      'MA Envelope', 'MA Convergence', 'MA Divergence', 'MA Support',
      
      // Фибоначчи
      'Fibonacci Retracement', 'Fibonacci Extension', 'Fibonacci Fan',
      'Fibonacci Arc', 'Fibonacci Time Zones', 'Fibonacci Projection',
      
      // Паттерны
      'Chart Pattern', 'Reversal Pattern', 'Continuation Pattern',
      'Harmonic Pattern', 'Elliott Wave', 'Gartley Pattern', 'Butterfly Pattern',
      
      // Крипто индикаторы
      'Crypto Indicators', 'Bitcoin Analysis', 'Ethereum Signals',
      'Altcoin Trading', 'DeFi Indicators', 'NFT Trading',
      
      // Алгоритмический трейдинг
      'Algorithmic Trading', 'Bot Trading', 'Automated Trading',
      'Strategy Backtesting', 'Quantitative Analysis', 'Machine Learning Trading',
      
      // Психология рынка
      'Market Sentiment', 'Fear Greed Index', 'Put Call Ratio',
      'VIX Fear Index', 'Market Psychology', 'Behavioral Finance'
    ];
  }

  async init() {
    try {
      console.log('🚀 Инициализация поиска каналов с ТВ индикаторами...');
      
      await this.mt.start();
      console.log('✅ MTProto клиент подключен');
      
      await this.smartSearch.init(this.client);
      console.log('✅ SmartGlobalSearch инициализирован');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async findTradingViewChannels() {
    console.log(`🔍 Начинаю поиск каналов с ТВ индикаторами по ${this.tradingViewKeywords.length} ключевым словам...`);
    
    const allChannels = new Map(); // Избегаем дубликатов
    let processedKeywords = 0;
    
    for (const keyword of this.tradingViewKeywords) {
      try {
        console.log(`\n�� Поиск по ключевому слову: "${keyword}"`);
        
        // Используем существующую архитектуру SmartGlobalSearch
        const results = await this.smartSearch.smartSearch(keyword, {
          limit: 5, // Ограничиваем для производительности
          aiAnalysisLimit: 3,
          analysisDelay: 1000
        });
        
        console.log(`✅ Найдено ${results.length} каналов по "${keyword}"`);
        
        // Добавляем результаты в общую коллекцию
        results.forEach(channel => {
          const key = channel.id || channel.title;
          if (!allChannels.has(key)) {
            allChannels.set(key, {
              ...channel,
              foundByKeywords: [keyword]
            });
          } else {
            // Добавляем ключевое слово к существующему каналу
            const existing = allChannels.get(key);
            if (!existing.foundByKeywords.includes(keyword)) {
              existing.foundByKeywords.push(keyword);
            }
          }
        });
        
        processedKeywords++;
        console.log(`📈 Прогресс: ${processedKeywords}/${this.tradingViewKeywords.length} ключевых слов`);
        
        // Задержка между поисками
        await this.delay(2000);
        
      } catch (error) {
        console.error(`❌ Ошибка поиска по "${keyword}":`, error.message);
        continue;
      }
    }
    
    console.log(`\n🎯 ПОИСК ЗАВЕРШЕН!`);
    console.log(`📊 Найдено уникальных каналов: ${allChannels.size}`);
    
    return Array.from(allChannels.values());
  }

  async analyzeResults(channels) {
    console.log('\n📊 АНАЛИЗ РЕЗУЛЬТАТОВ:');
    
    // Сортируем по количеству найденных ключевых слов
    const sortedChannels = channels.sort((a, b) => b.foundByKeywords.length - a.foundByKeywords.length);
    
    // Топ-20 каналов
    console.log('\n🏆 ТОП-20 КАНАЛОВ С ТВ ИНДИКАТОРАМИ:');
    sortedChannels.slice(0, 20).forEach((channel, index) => {
      console.log(`\n${index + 1}. 📺 ${channel.title}`);
      console.log(`   👥 ${channel.participantsCount} участников`);
      console.log(`   🔍 Найден по ${channel.foundByKeywords.length} ключевым словам:`);
      console.log(`   📝 ${channel.foundByKeywords.slice(0, 5).join(', ')}${channel.foundByKeywords.length > 5 ? '...' : ''}`);
      
      if (channel.aiAnalysis && !channel.aiAnalysis.error) {
        console.log(`   🧠 AI Рейтинг: ${channel.aiAnalysis.qualityScore}/10`);
        console.log(`   🎯 ${channel.aiAnalysis.verdict}`);
      }
      
      if (channel.username) {
        console.log(`   🔗 @${channel.username}`);
      }
    });
    
    // Статистика по ключевым словам
    const keywordStats = {};
    channels.forEach(channel => {
      channel.foundByKeywords.forEach(keyword => {
        keywordStats[keyword] = (keywordStats[keyword] || 0) + 1;
      });
    });
    
    const topKeywords = Object.entries(keywordStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    console.log('\n📈 ТОП-10 САМЫХ ЭФФЕКТИВНЫХ КЛЮЧЕВЫХ СЛОВ:');
    topKeywords.forEach(([keyword, count], index) => {
      console.log(`${index + 1}. "${keyword}" - ${count} каналов`);
    });
    
    return sortedChannels;
  }

  async saveResults(channels) {
    const fs = require('fs').promises;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Сохраняем в JSON
    const jsonFile = `tradingview_channels_${timestamp}.json`;
    await fs.writeFile(jsonFile, JSON.stringify(channels, null, 2));
    console.log(`\n💾 Результаты сохранены в: ${jsonFile}`);
    
    // Создаем краткий отчет
    const reportFile = `tradingview_report_${timestamp}.txt`;
    let report = `ОТЧЕТ ПОИСКА КАНАЛОВ С ТВ ИНДИКАТОРАМИ\n`;
    report += `Дата: ${new Date().toLocaleString()}\n`;
    report += `Найдено каналов: ${channels.length}\n`;
    report += `Ключевых слов использовано: ${this.tradingViewKeywords.length}\n\n`;
    
    report += `ТОП-10 КАНАЛОВ:\n`;
    channels.slice(0, 10).forEach((channel, index) => {
      report += `${index + 1}. ${channel.title} (${channel.participantsCount} участников)\n`;
      report += `   Найден по: ${channel.foundByKeywords.join(', ')}\n`;
      if (channel.username) report += `   @${channel.username}\n`;
      report += `\n`;
    });
    
    await fs.writeFile(reportFile, report);
    console.log(`📄 Отчет сохранен в: ${reportFile}`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const finder = new TradingViewChannelsFinder();
  
  try {
    await finder.init();
    const channels = await finder.findTradingViewChannels();
    const analyzedChannels = await finder.analyzeResults(channels);
    await finder.saveResults(analyzedChannels);
    
    console.log('\n✅ ПОИСК ЗАВЕРШЕН УСПЕШНО!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}

module.exports = TradingViewChannelsFinder;
