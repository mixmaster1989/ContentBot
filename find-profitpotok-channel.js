require('dotenv').config();
const SmartGlobalSearch = require('./core/smart-global-search');
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');

class ProfitPotokChannelFinder {
  constructor() {
    // Меняем рабочую директорию как в проекте
    process.chdir('/home/user1/telegram_parser');
    
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.smartSearch = new SmartGlobalSearch();
    
    // Варианты поиска канала ПРОФИТПОТОК
    this.searchQueries = [
      'ПРОФИТПОТОК',
      'profitpotok',
      'ProfitPotok',
      'профитпоток',
      'ПрофитПоток',
      'PROFIT POTOK',
      'profit potok'
    ];
    
    this.foundChannels = [];
  }

  async init() {
    try {
      console.log('🚀 Инициализация поиска канала ПРОФИТПОТОК...');
      
      // Подключаем MTProto клиент
      await this.mt.start();
      console.log('✅ Telegram клиент подключен');
      
      // Инициализируем поисковый движок
      await this.smartSearch.init(this.client);
      console.log('✅ Поисковый движок инициализирован');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации:', error);
      throw error;
    }
  }

  async findProfitPotokChannel() {
    try {
      console.log('🔍 Поиск канала ПРОФИТПОТОК...');
      console.log('=====================================');
      
      for (const query of this.searchQueries) {
        console.log(`\n🔎 Поиск по запросу: "${query}"`);
        
        try {
          // Используем умный поиск с AI анализом
          const results = await this.smartSearch.smartSearch(query, {
            maxResults: 20,
            aiAnalysisLimit: 5,
            analysisDelay: 1000
          });
          
          if (results && results.length > 0) {
            console.log(`✅ Найдено ${results.length} результатов для "${query}"`);
            
            // Фильтруем результаты по релевантности к ПРОФИТПОТОК
            const relevantResults = results.filter(channel => 
              this.isRelevantToProfitPotok(channel, query)
            );
            
            if (relevantResults.length > 0) {
              console.log(`🎯 Найдено ${relevantResults.length} релевантных каналов:`);
              
              for (const channel of relevantResults) {
                this.displayChannelInfo(channel, query);
                this.foundChannels.push({
                  ...channel,
                  searchQuery: query,
                  foundAt: new Date().toISOString()
                });
              }
            } else {
              console.log('❌ Релевантных каналов не найдено');
            }
          } else {
            console.log('❌ Результаты не найдены');
          }
          
        } catch (error) {
          console.error(`❌ Ошибка поиска для "${query}":`, error.message);
        }
        
        // Задержка между поисками
        await this.delay(2000);
      }
      
      // Выводим итоговый отчет
      this.displaySummary();
      
    } catch (error) {
      console.error('❌ Ошибка поиска канала ПРОФИТПОТОК:', error);
      throw error;
    }
  }

  isRelevantToProfitPotok(channel, query) {
    const title = (channel.title || '').toLowerCase();
    const username = (channel.username || '').toLowerCase();
    const description = (channel.description || '').toLowerCase();
    
    const profitPotokVariants = [
      'профитпоток', 'profitpotok', 'profit potok', 'профит поток'
    ];
    
    // Проверяем точное совпадение
    for (const variant of profitPotokVariants) {
      if (title.includes(variant) || username.includes(variant) || description.includes(variant)) {
        return true;
      }
    }
    
    // Проверяем частичное совпадение
    const queryLower = query.toLowerCase();
    if (title.includes(queryLower) || username.includes(queryLower)) {
      return true;
    }
    
    return false;
  }

  displayChannelInfo(channel, searchQuery) {
    console.log('\n📊 Информация о канале:');
    console.log(`   Название: ${channel.title || 'Не указано'}`);
    console.log(`   Username: @${channel.username || 'Не указано'}`);
    console.log(`   ID: ${channel.id || 'Не указано'}`);
    console.log(`   Участники: ${channel.participantsCount || 'Не указано'}`);
    console.log(`   Описание: ${(channel.description || 'Не указано').substring(0, 100)}...`);
    console.log(`   Найден по запросу: "${searchQuery}"`);
    
    if (channel.aiAnalysis) {
      console.log(`   AI Рейтинг: ${channel.aiAnalysis.rating || 'Не определен'}`);
      console.log(`   AI Вердикт: ${channel.aiAnalysis.verdict || 'Не определен'}`);
    }
    
    console.log(`   Ссылка: https://t.me/${channel.username || 'channel'}`);
    console.log('   ' + '='.repeat(50));
  }

  displaySummary() {
    console.log('\n📋 ИТОГОВЫЙ ОТЧЕТ');
    console.log('==================');
    console.log(`Всего найдено каналов: ${this.foundChannels.length}`);
    
    if (this.foundChannels.length > 0) {
      console.log('\n🎯 Найденные каналы:');
      this.foundChannels.forEach((channel, index) => {
        console.log(`${index + 1}. ${channel.title} (@${channel.username})`);
        console.log(`   Найден по запросу: "${channel.searchQuery}"`);
        console.log(`   Участники: ${channel.participantsCount || 'Не указано'}`);
        console.log(`   Ссылка: https://t.me/${channel.username}`);
        console.log('');
      });
    } else {
      console.log('❌ Канал ПРОФИТПОТОК не найден в вашем аккаунте');
      console.log('💡 Возможные причины:');
      console.log('   - Канал не существует или заблокирован');
      console.log('   - У вас нет доступа к каналу');
      console.log('   - Канал имеет другое название');
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    try {
      await this.client.disconnect();
      console.log('✅ Соединение закрыто');
    } catch (error) {
      console.error('❌ Ошибка закрытия соединения:', error);
    }
  }
}

// Запуск поиска
async function main() {
  const finder = new ProfitPotokChannelFinder();
  
  try {
    await finder.init();
    await finder.findProfitPotokChannel();
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await finder.stop();
  }
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ProfitPotokChannelFinder };
