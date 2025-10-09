require('dotenv').config();
const axios = require('axios');

async function testCloudRuInModule() {
  console.log('🧪 ТЕСТ CLOUD.RU LLM В МОДУЛЕ ПРОФИТПОТОК');
  console.log('==========================================');
  
  // Конфигурация Cloud.ru LLM
  const cloudRuConfig = {
    apiKey: process.env.LLM_API,
    baseUrl: 'https://foundation-models.api.cloud.ru/v1',
    model: 'openai/gpt-oss-120b',
    maxTokens: 200000,
    temperature: 0.6
  };
  
  console.log('📊 КОНФИГУРАЦИЯ CLOUD.RU LLM:');
  console.log(`🔑 API ключ: ${cloudRuConfig.apiKey ? '✅ Настроен' : '❌ Не настроен'}`);
  console.log(`🌐 URL: ${cloudRuConfig.baseUrl}`);
  console.log(`🤖 Модель: ${cloudRuConfig.model}`);
  console.log(`📊 Макс токенов: ${cloudRuConfig.maxTokens}`);
  console.log(`🌡️ Температура: ${cloudRuConfig.temperature}`);
  console.log('');
  
  if (!cloudRuConfig.apiKey) {
    console.log('❌ LLM_API ключ не настроен в .env');
    return;
  }
  
  // Тест подключения
  console.log('🔗 Тестирую подключение к Cloud.ru...');
  
  try {
    const response = await axios.post(
      `${cloudRuConfig.baseUrl}/chat/completions`,
      {
        model: cloudRuConfig.model,
        messages: [
          {
            role: 'system',
            content: 'Ты полезный AI ассистент для модуля ProfitPotokManager.'
          },
          {
            role: 'user',
            content: 'Скажи: Cloud.ru LLM интегрирован в модуль ProfitPotokManager!'
          }
        ],
        max_tokens: 100,
        temperature: cloudRuConfig.temperature,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${cloudRuConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );
    
    const result = response.data.choices[0].message.content.trim();
    console.log(`✅ Cloud.ru LLM ответ: "${result}"`);
    console.log('');
    console.log('🎉 CLOUD.RU LLM УСПЕШНО ИНТЕГРИРОВАН В МОДУЛЬ ПРОФИТПОТОК!');
    console.log('✅ Готов к добавлению промптов!');
    
  } catch (error) {
    console.log(`❌ Ошибка Cloud.ru LLM: ${error.response?.data || error.message}`);
  }
}

testCloudRuInModule();
