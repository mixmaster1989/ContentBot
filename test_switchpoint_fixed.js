// Тест switchpoint/router с ПРАВИЛЬНЫМИ параметрами
const { OpenRouterManager } = require('./telegram_parser/dist/ai/openrouter-manager');

async function testSwitchpointFixed() {
  const ai = OpenRouterManager.get();
  const prompt = 'Напиши короткий пост про архитектуру ПО (50 слов) с эмодзи 🚀💻';
  
  try {
    console.log('\n🧪 Тестирую switchpoint/router с ПРАВИЛЬНЫМИ параметрами');
    console.log('='.repeat(80));
    
    // УВЕЛИЧИВАЕМ max_tokens для роутера!
    const result = await ai.makeRequest([
      { role: 'user', content: prompt }
    ], 'switchpoint/router', {
      max_tokens: 10000,  // БОЛЬШЕ ТОКЕНОВ!
      temperature: 0.7
    });
    
    console.log('\n📋 ПОЛНЫЙ ОТВЕТ:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(result, null, 2));
    
    const text = result?.choices?.[0]?.message?.content || 'НЕТ КОНТЕНТА';
    console.log('\n📝 ТЕКСТ ОТВЕТА:');
    console.log('='.repeat(80));
    console.log(text);
    console.log(`Длина: ${text.length} символов`);
    
    return result;
    
  } catch (error) {
    console.log(`❌ ОШИБКА: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('🔧 Тест с исправленными параметрами...\n');
  
  const result = await testSwitchpointFixed();
  
  if (result) {
    console.log('\n✅ Тест завершен');
  } else {
    console.log('\n❌ Тест с ошибкой');
  }
}

main().catch(console.error);

