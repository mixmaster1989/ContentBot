// Тест новых моделей из списка
const { OpenRouterManager } = require('./telegram_parser/dist/ai/openrouter-manager');

const newModels = [
  'google/gemma-3n-2b-it',
  'tencent/hunyuan-a13b-instruct', 
  'tngtech/deepseek-tng-r1t2-chimera',
  'mistralai/mistral-small-3.2-24b-instruct-2506',
  'moonshotai/kimi-dev-72b',
  'deepseek/deepseek-r1-0528-qwen3-8b',
  'deepseek/deepseek-r1-0528'
];

async function testModel(modelName) {
  const ai = OpenRouterManager.get();
  const prompt = 'Напиши короткий пост про архитектуру ПО (50 слов) с эмодзи 🚀💻';
  
  try {
    console.log(`\n🧪 Тестирую модель: ${modelName}`);
    
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
  console.log('🚀 Тестирование новых моделей...\n');
  
  const results = [];
  
  for (const model of newModels) {
    const result = await testModel(model);
    results.push(result);
    
    // Пауза между запросами
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ НОВЫХ МОДЕЛЕЙ:');
  console.log('='.repeat(60));
  
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
    console.log(`Лучшие новые модели:`);
    working.slice(0, 3).forEach((r, i) => {
      console.log(`  ${i+1}. ${r.model}`);
    });
  } else {
    console.log('Все новые модели не работают!');
  }
}

main().catch(console.error);

