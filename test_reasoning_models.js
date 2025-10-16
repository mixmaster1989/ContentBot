// Тест reasoning моделей DeepSeek R1
const { OpenRouterManager } = require('./telegram_parser/dist/ai/openrouter-manager');

const reasoningModels = [
  'deepseek/deepseek-r1-0528-qwen3-8b',
  'deepseek/deepseek-r1-0528'
];

async function testReasoningModel(modelName) {
  const ai = OpenRouterManager.get();
  const prompt = 'Напиши короткий пост про архитектуру ПО (50 слов) с эмодзи 🚀💻';
  
  try {
    console.log(`\n🧠 Тестирую reasoning модель: ${modelName}`);
    console.log('='.repeat(60));
    
    const result = await ai.makeRequest([
      { role: 'user', content: prompt }
    ], modelName, {
      max_tokens: 500, // Больше токенов для reasoning
      temperature: 0.7
    });
    
    console.log('\n📋 ПОЛНЫЙ СЫРОЙ ОТВЕТ:');
    console.log('='.repeat(60));
    
    // Выводим весь ответ
    const fullResponse = JSON.stringify(result, null, 2);
    console.log(fullResponse);
    
    console.log('\n📝 ТОЛЬКО ТЕКСТ:');
    console.log('='.repeat(60));
    
    const text = result?.choices?.[0]?.message?.content || result?.text || 'НЕТ ТЕКСТА';
    console.log(text);
    
    console.log('\n🔍 АНАЛИЗ:');
    console.log('='.repeat(60));
    
    if (text.includes('<think>')) {
      console.log('✅ Найдены <think> токены - это reasoning модель!');
      const thinkMatch = text.match(/<think>(.*?)<\/think>/s);
      if (thinkMatch) {
        console.log('\n💭 REASONING ПРОЦЕСС:');
        console.log(thinkMatch[1]);
      }
    } else {
      console.log('❌ Нет <think> токенов');
    }
    
    if (text && text !== 'НЕТ ТЕКСТА') {
      console.log(`✅ ${modelName} - РАБОТАЕТ`);
      return { model: modelName, status: 'working', response: text, fullResponse };
    } else {
      console.log(`❌ ${modelName} - НЕТ ОТВЕТА`);
      return { model: modelName, status: 'no_response', fullResponse };
    }
    
  } catch (error) {
    console.log(`❌ ${modelName} - ОШИБКА: ${error.message}`);
    return { model: modelName, status: 'error', error: error.message };
  }
}

async function main() {
  console.log('🧠 Тестирование reasoning моделей DeepSeek R1...\n');
  
  for (const model of reasoningModels) {
    await testReasoningModel(model);
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎯 ТЕСТИРОВАНИЕ ЗАВЕРШЕНО!');
}

main().catch(console.error);

