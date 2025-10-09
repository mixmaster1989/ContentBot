require('dotenv').config();
const { MTProtoClient } = require('../../telegram_parser/dist/mtproto/client');
const { Api } = require('telegram');
const axios = require('axios');
const fs = require('fs');

class FinalCryptoRadioDJ {
  constructor() {
    this.mt = MTProtoClient.get();
    this.client = this.mt.getClient();
    this.cloudRuConfig = {
      apiKey: process.env.LLM_API,
      baseUrl: 'https://foundation-models.api.cloud.ru/v1',
      model: 'openai/gpt-oss-120b',
      maxTokens: 200000,
      temperature: 0.6
    };
  }

  async init() {
    await this.mt.start();
    console.log('✅ Telegram клиент подключен');
  }

  async getCryptoChannels() {
    try {
      console.log('🔍 Получаю каналы из папки КРИПТА...');
      const dialogFilters = await this.client.invoke(new Api.messages.GetDialogFilters());
      const cryptoFilter = dialogFilters.filters.find(filter => filter.title === 'КРИПТА');
      
      if (!cryptoFilter) {
        console.log('❌ Папка КРИПТА не найдена');
        return [];
      }

      console.log(`✅ Папка КРИПТА найдена: "${cryptoFilter.title}" (ID: ${cryptoFilter.id})`);
      
      const channels = [];
      for (const peer of cryptoFilter.includePeers) {
        try {
          const channelEntity = await this.client.getEntity(peer);
          channels.push({
            id: channelEntity.id,
            title: channelEntity.title || 'Без названия',
            username: channelEntity.username || null,
            accessHash: channelEntity.accessHash,
            entity: channelEntity
          });
        } catch (error) {
          console.error(`❌ Ошибка получения канала: ${error.message}`);
        }
      }
      
      console.log(`📊 Всего каналов в папке: ${channels.length}`);
      return channels;
    } catch (error) {
      console.error('❌ Ошибка получения папки КРИПТА:', error.message);
      return [];
    }
  }

  async getChannelMessages(channelEntity, limit = 10) {
    try {
      const messages = await this.client.invoke(
        new Api.messages.GetHistory({
          peer: channelEntity,
          limit: limit,
          offsetDate: 0,
          offsetId: 0,
          minId: 0,
          maxId: 0,
          addOffset: 0
        })
      );

      return messages.messages.map(msg => ({
        id: msg.id,
        text: msg.message || '',
        date: new Date(msg.date * 1000),
        timestamp: msg.date,
        channelTitle: channelEntity.title || 'Unknown'
      }));
    } catch (error) {
      console.error(`❌ Ошибка получения сообщений из ${channelEntity.title}:`, error.message);
      return [];
    }
  }

  async collectMessages() {
    console.log('🔍 Собираю сообщения из каналов...');
    const allMessages = [];

    const channels = await this.getCryptoChannels();
    
    // Берем первые 5 каналов для теста
    const testChannels = channels.slice(0, 5);
    console.log(`🎯 Тестирую ${testChannels.length} каналов`);

    for (const channel of testChannels) {
      try {
        const messages = await this.getChannelMessages(channel.entity, 5);
        allMessages.push(...messages);
        console.log(`✅ Получено ${messages.length} сообщений из ${channel.title}`);
      } catch (error) {
        console.error(`❌ Ошибка с каналом ${channel.title}:`, error.message);
      }
    }

    // Сортируем по времени (новые сверху)
    allMessages.sort((a, b) => b.timestamp - a.timestamp);

    return allMessages;
  }

  async generatePodcast(messages) {
    const prompt = `Ты - первый в мире диджей крипторадио "ПРОФИТ-ПРОВОДНИК" 🎧⚡

Твоя задача: создать захватывающий подкаст на основе последних новостей и сигналов из криптомира.

СТИЛЬ ПОДАЧИ:
- Говори как настоящий радиоведущий - энергично, с драйвом
- Используй крипто-сленг и мемы (HODL, TO THE MOON, DIAMOND HANDS)
- Добавляй эмодзи для визуального эффекта
- Создавай интригу и напряжение
- Будь провокационным, но не токсичным
- МАТ: используй мат редко, но очень красиво и в тему! Когда нужно подчеркнуть важность или эмоцию

СТРУКТУРА ПОДКАСТА:
1. 🎵 INTRO: "Добро пожаловать на ПРОФИТ-ПРОВОДНИК! Где сливки криптомира встречаются с вашими ушами!"
2. 📊 СИГНАЛЫ: Анализируй торговые сигналы, объясняй логику
3. 🔥 НОВОСТИ: Самые горячие новости с комментариями
4. 🚀 ПРОГНОЗЫ: Куда движется рынок
5. 🎵 OUTRO: "Это был ПРОФИТ-ПРОВОДНИК! HODL крепче, трейдь умнее!"

ВАЖНО:
- НИКОГДА не упоминай источники информации
- Подавай информацию как свою собственную аналитику
- Создавай ощущение эксклюзивности
- Используй фразы типа "мои источники говорят", "я вижу", "анализируя данные"

ФОРМАТИРОВАНИЕ:
- Заголовки с эмодзи
- Выделение ключевых моментов
- Списки и структурированная подача
- Эмоциональные акценты
- ВРЕМЕННЫЕ МЕТКИ: обязательно указывай время для каждого блока (например, [00:15], [02:30])

Создай подкаст длиной 300-500 слов на основе предоставленной информации.

ИНФОРМАЦИЯ ДЛЯ АНАЛИЗА:
${messages.map(msg => `[${msg.date.toISOString()}] ${msg.text}`).join('\n')}`;

    try {
      const response = await axios.post(
        `${this.cloudRuConfig.baseUrl}/chat/completions`,
        {
          model: this.cloudRuConfig.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.cloudRuConfig.maxTokens,
          temperature: this.cloudRuConfig.temperature
        },
        {
          headers: {
            'Authorization': `Bearer ${this.cloudRuConfig.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('❌ Ошибка генерации подкаста:', error.message);
      return null;
    }
  }

  async createPodcast() {
    try {
      console.log('🎧 Создаю крипторадио подкаст...');
      
      const messages = await this.collectMessages();
      console.log(`📊 Собрано ${messages.length} сообщений`);

      if (messages.length === 0) {
        console.log('❌ Нет сообщений для анализа');
        return;
      }

      const podcast = await this.generatePodcast(messages);
      
      if (podcast) {
        const filename = `podcast_${new Date().toISOString().split('T')[0]}_${Date.now()}.txt`;
        fs.writeFileSync(filename, podcast);
        console.log(`✅ Подкаст сохранен в файл: ${filename}`);
        console.log('\n🎧 ПОДКАСТ:');
        console.log('==========');
        console.log(podcast);
      }
    } catch (error) {
      console.error('❌ Ошибка создания подкаста:', error.message);
    }
  }

  async stop() {
    await this.client.disconnect();
    console.log('✅ Соединение закрыто');
  }
}

// Запуск
if (require.main === module) {
  const dj = new FinalCryptoRadioDJ();
  
  dj.init().then(async () => {
    await dj.createPodcast();
    await dj.stop();
  }).catch(console.error);
}

module.exports = { FinalCryptoRadioDJ };
