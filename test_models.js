// Тест всех моделей из списка
const { OpenRouterManager } = require('./telegram_parser/dist/ai/openrouter-manager');

const models = [
  'meta-llama/llama-3.3-70b-instruct',
  'qwen/qwen-2.5-72b-instruct', 
  'meta-llama/llama-3.2-3b-instruct',
  'mistralai/mistral-7b-instruct',
  'qwen/qwen-2.5-coder-32b-instruct',
  'deepseek/deepseek-v3.1',
  'mistralai/mistral-nemo',
  'tongyi/deepresearch-30b-a3b',
  'nvidia/nemotron-nano-9b-v2'
];

async function testModel(modelName) {
  const ai = OpenRouterManager.get();
  const prompt = 'Напиши короткий пост про архитектуру ПО (50 слов) с эмодзи 🚀💻';
  
  try {
    console.log(`\n🧪 Тестирую модель: ${modelName}`);
    
    // Временно меняем модель
    const result = await ai.makeRequest([
      { role: 'user', content: prompt }
    ], modelName, {
      max_tokens: 120,
      temperature: 0.7
    });
    
    const text = result?.choices?.[0]?.message?.content || result?.text;
    if (text) {
      console.log(`✅ ${modelName} - РАБОТАЕТ`);
      console.log(`📝 Ответ: ${text.substring(0, 120)}...`);
      return { model: modelName, status: 'working', response: text };
    } else {
      console.log(`❌ ${modelName} - НЕТ ОТВЕТА`);
      return { model: modelName, status: 'no_response' };
    }
    
  } catch (error) {
    console.log(`❌ ${modelName} - ОШИБКА: ${error.message}`);
    return { model: modelName, status: 'error', error: error.message };
  }
}

async function main() {
  console.log('🚀 Тестирование всех моделей...\n');
  
  const results = [];
  
  for (const model of models) {
    const result = await testModel(model);
    results.push(result);
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ:');
  console.log('='.repeat(50));
  
  const working = results.filter(r => r.status === 'working');
  const errors = results.filter(r => r.status === 'error');
  const noResponse = results.filter(r => r.status === 'no_response');
  
  console.log(`\n✅ РАБОЧИЕ МОДЕЛИ (${working.length}):`);
  working.forEach(r => console.log(`  - ${r.model}`));
  
  console.log(`\n❌ ОШИБКИ (${errors.length}):`);
  errors.forEach(r => console.log(`  - ${r.model}: ${r.error}`));
  
  console.log(`\n⚠️ БЕЗ ОТВЕТА (${noResponse.length}):`);
  noResponse.forEach(r => console.log(`  - ${r.model}`));
  
  console.log('\n🎯 РЕКОМЕНДАЦИЯ:');
  if (working.length > 0) {
    console.log(`Используй: ${working[0].model} (первая рабочая)`);
  } else {
    console.log('Все модели не работают!');
  }
}

main().catch(console.error);
