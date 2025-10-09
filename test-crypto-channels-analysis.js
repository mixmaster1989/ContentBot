require('dotenv').config();
const { ProfitPotokManager } = require('./core/profitpotok-manager');

async function analyzeCryptoChannels() {
  const manager = new ProfitPotokManager();
  
  try {
    console.log('🔍 АНАЛИЗ КАНАЛОВ ПАПКИ КРИПТА');
    console.log('===============================');
    
    // Инициализация
    await manager.init();
    
    // Получаем каналы из папки КРИПТА
    console.log('📁 Получаю каналы из папки КРИПТА...');
    const folderInfo = await manager.viewCryptoFolder();
    
    if (!folderInfo.found || folderInfo.channels.length === 0) {
      console.log('❌ Папка КРИПТА не найдена или пуста');
      return;
    }
    
    console.log(`✅ Найдено каналов: ${folderInfo.channels.length}`);
    console.log('');
    
    // Анализируем каждый канал
    const channelAnalysis = [];
    
    for (let i = 0; i < folderInfo.channels.length; i++) {
      const channel = folderInfo.channels[i];
      console.log(`📊 Анализирую канал ${i + 1}/${folderInfo.channels.length}: ${channel.title}`);
      
      try {
        // Получаем 10 сообщений из канала
        const messages = await manager.getCryptoFolderMessages(10);
        const channelMessages = messages.filter(msg => msg.channelTitle === channel.title);
        
        console.log(`   📝 Сообщений получено: ${channelMessages.length}`);
        
        // Анализируем тип контента
        const analysis = analyzeChannelContent(channelMessages);
        
        channelAnalysis.push({
          channel: channel,
          messageCount: channelMessages.length,
          analysis: analysis,
          sampleMessages: channelMessages.slice(0, 3) // Первые 3 сообщения для примера
        });
        
        console.log(`   🎯 Тип контента: ${analysis.primaryType}`);
        console.log(`   📈 Сигналы: ${analysis.signalCount}, Аналитика: ${analysis.analysisCount}, Новости: ${analysis.newsCount}`);
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ Ошибка анализа канала ${channel.title}: ${error.message}`);
        channelAnalysis.push({
          channel: channel,
          messageCount: 0,
          analysis: { primaryType: 'Ошибка', signalCount: 0, analysisCount: 0, newsCount: 0 },
          sampleMessages: []
        });
      }
    }
    
    // Выводим итоговый анализ
    console.log('📊 ИТОГОВЫЙ АНАЛИЗ КАНАЛОВ');
    console.log('==========================');
    
    const signalChannels = channelAnalysis.filter(c => c.analysis.primaryType === 'Сигналы');
    const analysisChannels = channelAnalysis.filter(c => c.analysis.primaryType === 'Аналитика');
    const newsChannels = channelAnalysis.filter(c => c.analysis.primaryType === 'Новости');
    const mixedChannels = channelAnalysis.filter(c => c.analysis.primaryType === 'Смешанный');
    
    console.log(`🎯 КАНАЛЫ С ЧИСТЫМИ СИГНАЛАМИ (${signalChannels.length}):`);
    signalChannels.forEach(c => {
      console.log(`   • ${c.channel.title} - ${c.analysis.signalCount} сигналов`);
    });
    
    console.log(`\n📈 КАНАЛЫ С СИГНАЛАМИ + ОБОСНОВАНИЕМ (${analysisChannels.length}):`);
    analysisChannels.forEach(c => {
      console.log(`   • ${c.channel.title} - ${c.analysis.signalCount} сигналов, ${c.analysis.analysisCount} аналитики`);
    });
    
    console.log(`\n📰 КАНАЛЫ С НОВОСТЯМИ (${newsChannels.length}):`);
    newsChannels.forEach(c => {
      console.log(`   • ${c.channel.title} - ${c.analysis.newsCount} новостей`);
    });
    
    console.log(`\n🔄 СМЕШАННЫЕ КАНАЛЫ (${mixedChannels.length}):`);
    mixedChannels.forEach(c => {
      console.log(`   • ${c.channel.title} - С:${c.analysis.signalCount} А:${c.analysis.analysisCount} Н:${c.analysis.newsCount}`);
    });
    
    // Показываем примеры сообщений
    console.log('\n📝 ПРИМЕРЫ СООБЩЕНИЙ:');
    console.log('====================');
    
    channelAnalysis.forEach((channel, index) => {
      if (channel.sampleMessages.length > 0) {
        console.log(`\n${index + 1}. ${channel.channel.title}:`);
        channel.sampleMessages.forEach((msg, msgIndex) => {
          console.log(`   ${msgIndex + 1}. ${msg.text.substring(0, 100)}...`);
        });
      }
    });
    
  } catch (error) {
    console.error('\n❌ ОШИБКА АНАЛИЗА:', error.message);
    console.error('Детали:', error);
  } finally {
    await manager.stop();
  }
}

function analyzeChannelContent(messages) {
  let signalCount = 0;
  let analysisCount = 0;
  let newsCount = 0;
  
  const signalKeywords = [
    'BUY', 'SELL', 'LONG', 'SHORT', 'ВХОД', 'ВЫХОД', 'СТОП', 'ТЕЙК',
    'покупка', 'продажа', 'открыть', 'закрыть', 'позиция', 'сигнал',
    'BTC', 'ETH', 'USDT', 'цена', 'курс', 'график', 'технический анализ'
  ];
  
  const analysisKeywords = [
    'анализ', 'прогноз', 'тренд', 'поддержка', 'сопротивление', 'фибоначчи',
    'RSI', 'MACD', 'Bollinger', 'уровень', 'зона', 'паттерн', 'формация',
    'фундаментальный', 'технический', 'обоснование', 'логика', 'причина'
  ];
  
  const newsKeywords = [
    'новость', 'новости', 'событие', 'события', 'обновление', 'обновления',
    'релиз', 'запуск', 'партнерство', 'интеграция', 'листинг', 'делистинг',
    'регулирование', 'закон', 'законодательство', 'запрет', 'разрешение'
  ];
  
  messages.forEach(msg => {
    const text = msg.text.toLowerCase();
    
    // Проверяем на сигналы
    const hasSignals = signalKeywords.some(keyword => text.includes(keyword.toLowerCase()));
    if (hasSignals) signalCount++;
    
    // Проверяем на аналитику
    const hasAnalysis = analysisKeywords.some(keyword => text.includes(keyword.toLowerCase()));
    if (hasAnalysis) analysisCount++;
    
    // Проверяем на новости
    const hasNews = newsKeywords.some(keyword => text.includes(keyword.toLowerCase()));
    if (hasNews) newsCount++;
  });
  
  // Определяем основной тип контента
  let primaryType = 'Неопределенный';
  
  if (signalCount > analysisCount && signalCount > newsCount) {
    primaryType = 'Сигналы';
  } else if (analysisCount > signalCount && analysisCount > newsCount) {
    primaryType = 'Аналитика';
  } else if (newsCount > signalCount && newsCount > analysisCount) {
    primaryType = 'Новости';
  } else if (signalCount > 0 && analysisCount > 0) {
    primaryType = 'Смешанный';
  }
  
  return {
    primaryType,
    signalCount,
    analysisCount,
    newsCount,
    totalMessages: messages.length
  };
}

// Запуск анализа
if (require.main === module) {
  analyzeCryptoChannels().catch(console.error);
}

module.exports = { analyzeCryptoChannels };
