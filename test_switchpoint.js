// Тест модели switchpoint/router
const { OpenRouterManager } = require('./telegram_parser/dist/ai/openrouter-manager');

async function testSwitchpointModel() {
  const ai = OpenRouterManager.get();
  const prompt = 'Напиши короткий пост про архитектуру ПО (50 слов) с эмодзи 🚀💻';
  
  try {
    console.log('\n🧪 Тестирую модель: switchpoint/router');
    console.log('='.repeat(60));
    
    const result = await ai.makeRequest([
      { role: 'user', content: prompt }
    ], 'switchpoint/router', {
      max_tokens: 200,
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
    
    if (text && text !== 'НЕТ ТЕКСТА') {
      console.log(`✅ switchpoint/router - РАБОТАЕТ`);
      console.log(`📊 Длина ответа: ${text.length} символов`);
      console.log(`🎯 Качество: ${text.includes('🚀') && text.includes('💻') ? 'Хорошее (есть эмодзи)' : 'Среднее'}`);
      return { model: 'switchpoint/router', status: 'working', response: text, fullResponse };
    } else {
      console.log(`❌ switchpoint/router - НЕТ ОТВЕТА`);
      return { model: 'switchpoint/router', status: 'no_response', fullResponse };
    }
    
  } catch (error) {
    console.log(`❌ switchpoint/router - ОШИБКА: ${error.message}`);
    return { model: 'switchpoint/router', status: 'error', error: error.message };
  }
}

async function main() {
  console.log('🧪 Тестирование модели switchpoint/router...\n');
  
  const result = await testSwitchpointModel();
  
  console.log('\n🎯 РЕЗУЛЬТАТ:');
  console.log('='.repeat(60));
  
  if (result.status === 'working') {
    console.log('✅ Модель работает!');
    console.log('📝 Пример ответа:');
    console.log(result.response.substring(0, 200) + '...');
  } else if (result.status === 'error') {
    console.log('❌ Модель не работает:');
    console.log(result.error);
  } else {
    console.log('⚠️ Модель отвечает, но без текста');
  }
}

main().catch(console.error);

