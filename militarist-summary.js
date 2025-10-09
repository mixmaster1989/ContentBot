require('dotenv').config();
const { MTProtoClient } = require('../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');
const { LLMRewriter } = require('./llm/llm-rewriter');

class MilitaristSummarizer {
  constructor() {
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.militaristChannelId = -1001111348665; // ID канала "Милитарист" (с префиксом -100)
    
    // Инициализируем OpenAI с ключом из .env
    const { OpenAI } = require('openai');
    this.openai = new OpenAI({
      apiKey: process.env.LLM_API || process.env.OPENROUTER_API_KEY
    });
  }

  async init() {
    try {
      await this.client.connect();
      console.log('✅ Подключение к Telegram установлено');
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
    }
  }

  // Получить сообщения за период
  async getMessagesFromTime(startTime) {
    try {
      console.log(`📅 Получаю сообщения с ${new Date(startTime).toLocaleString('ru')}...`);
      
      const messages = await this.client.invoke(
        new Api.messages.GetHistory({
          peer: this.militaristChannelId,
          limit: 200, // Увеличиваем лимит для получения больше сообщений
          offsetDate: Math.floor(startTime / 1000), // Конвертируем в секунды
          offsetId: 0,
          maxId: 0,
          minId: 0,
          addOffset: 0,
          hash: 0n
        })
      );

      console.log(`✅ Получено ${messages.messages.length} сообщений`);
      
      // Отладочная информация
      if (messages.messages.length > 0) {
        const firstMsg = messages.messages[0];
        const lastMsg = messages.messages[messages.messages.length - 1];
        console.log(`📅 Первое сообщение: ${new Date(firstMsg.date * 1000).toLocaleString('ru')}`);
        console.log(`📅 Последнее сообщение: ${new Date(lastMsg.date * 1000).toLocaleString('ru')}`);
        console.log(`📅 Ищем с: ${new Date(startTime).toLocaleString('ru')}`);
      }
      
      // Фильтруем сообщения по наличию текста
      const filteredMessages = messages.messages
        .filter(msg => 
          msg.message && 
          msg.message.length > 30 // Минимум 30 символов
        )
        .map(msg => ({
          id: msg.id,
          text: msg.message,
          date: new Date(msg.date * 1000),
          views: msg.views || 0,
          timestamp: msg.date * 1000
        }))
        .sort((a, b) => b.timestamp - a.timestamp); // Сортируем по времени (новые сверху)

      console.log(`📊 Отфильтровано ${filteredMessages.length} релевантных сообщений`);
      
      return filteredMessages;

    } catch (error) {
      console.error('❌ Ошибка получения сообщений:', error);
      return [];
    }
  }

  // Создать сводку через LLM
  async createSummary(messages) {
    try {
      console.log('🤖 Создаю сводку через LLM...');
      
      // Объединяем все сообщения в один текст
      const combinedText = messages
        .map(msg => `[${msg.date.toLocaleString('ru')}] ${msg.text}`)
        .join('\n\n');

      console.log(`📝 Общий объем текста: ${combinedText.length} символов`);

      // Создаем промпт для сводки
      const prompt = `
Создай краткую сводку военных новостей из канала "Милитарист" за последние сутки.

ИСХОДНЫЕ ДАННЫЕ:
${combinedText}

ТРЕБОВАНИЯ К СВОДКЕ:
- Объем: 2-3 абзаца (300-500 слов)
- Стиль: профессиональный, информативный
- Структура: основные события + детали + выводы
- Язык: русский
- Фокус: военные новости, конфликты, техника, операции

СВОДКА:`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Ты военный аналитик, создающий краткие сводки новостей. Анализируй информацию объективно и профессионально."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      const summary = response.choices[0].message.content.trim();
      
      return {
        summary,
        messageCount: messages.length,
        timeRange: {
          from: messages[messages.length - 1]?.date || new Date(),
          to: messages[0]?.date || new Date()
        },
        totalViews: messages.reduce((sum, msg) => sum + msg.views, 0)
      };

    } catch (error) {
      console.error('❌ Ошибка создания сводки:', error);
      
      // Fallback - простая сводка
      return {
        summary: `Получено ${messages.length} сообщений из канала "Милитарист" за указанный период. Основные темы: военные операции, военная техника, конфликты.`,
        messageCount: messages.length,
        timeRange: {
          from: messages[messages.length - 1]?.date || new Date(),
          to: messages[0]?.date || new Date()
        },
        totalViews: messages.reduce((sum, msg) => sum + msg.views, 0)
      };
    }
  }

  // Показать статистику
  showStats(messages, summary) {
    console.log('\n📊 СТАТИСТИКА СВОДКИ');
    console.log('=' .repeat(50));
    console.log(`📅 Период: ${summary.timeRange.from.toLocaleString('ru')} - ${summary.timeRange.to.toLocaleString('ru')}`);
    console.log(`📝 Сообщений обработано: ${summary.messageCount}`);
    console.log(`👀 Общее количество просмотров: ${summary.totalViews.toLocaleString()}`);
    console.log(`📈 Среднее просмотров на пост: ${Math.round(summary.totalViews / summary.messageCount).toLocaleString()}`);
    console.log(`📏 Длина сводки: ${summary.summary.length} символов`);
  }

  // Сохранить сводку в файл
  async saveSummary(summary, messages) {
    try {
      const fs = require('fs').promises;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `militarist_summary_${timestamp}.txt`;
      
      const content = `СВОДКА КАНАЛА "МИЛИТАРИСТ"
${'='.repeat(50)}

Период: ${summary.timeRange.from.toLocaleString('ru')} - ${summary.timeRange.to.toLocaleString('ru')}
Сообщений: ${summary.messageCount}
Просмотров: ${summary.totalViews.toLocaleString()}

${summary.summary}

${'='.repeat(50)}
Создано: ${new Date().toLocaleString('ru')}
Источник: @infantmilitario (ID: ${this.militaristChannelId})
`;

      await fs.writeFile(filename, content, 'utf8');
      console.log(`💾 Сводка сохранена в файл: ${filename}`);
      
      return filename;
    } catch (error) {
      console.error('❌ Ошибка сохранения файла:', error);
      return null;
    }
  }

  async close() {
    if (this.client) {
      await this.client.disconnect();
      console.log('🛑 Соединение закрыто');
    }
  }
}

// Основная функция
async function createMilitaristSummary() {
  const summarizer = new MilitaristSummarizer();
  
  try {
    await summarizer.init();
    
    // Берем все последние сообщения (за последние 3 дня)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 часа назад
    
    console.log(`🎯 Создание сводки канала "Милитарист"`);
    console.log(`📅 Период: с ${yesterday.toLocaleString('ru')} до ${now.toLocaleString('ru')}`);
    console.log('');
    
    // Получаем сообщения
    const messages = await summarizer.getMessagesFromTime(yesterday.getTime());
    
    if (messages.length === 0) {
      console.log('❌ Сообщения за указанный период не найдены');
      return;
    }
    
    // Создаем сводку
    const summary = await summarizer.createSummary(messages);
    
    // Показываем результат
    console.log('\n🎯 СВОДКА КАНАЛА "МИЛИТАРИСТ"');
    console.log('=' .repeat(60));
    console.log(summary.summary);
    console.log('=' .repeat(60));
    
    // Показываем статистику
    summarizer.showStats(messages, summary);
    
    // Сохраняем в файл
    await summarizer.saveSummary(summary, messages);
    
    console.log('\n✅ Сводка создана успешно!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
  } finally {
    await summarizer.close();
  }
}

// Запуск создания сводки
if (require.main === module) {
  createMilitaristSummary();
}

module.exports = { MilitaristSummarizer };
