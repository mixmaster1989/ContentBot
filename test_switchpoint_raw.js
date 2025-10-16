// Тест модели switchpoint/router - СЫРОЙ ответ
const { OpenRouterManager } = require('./telegram_parser/dist/ai/openrouter-manager');

async function testSwitchpointRaw() {
  const ai = OpenRouterManager.get();
  const prompt = 'Напиши короткий пост про архитектуру ПО (50 слов) с эмодзи 🚀💻';
  
  try {
    console.log('\n🧪 Тестирую switchpoint/router - СЫРОЙ ответ');
    console.log('='.repeat(80));
    
    const result = await ai.makeRequest([
      { role: 'user', content: prompt }
    ], 'switchpoint/router', {
      max_tokens: 200,
      temperature: 0.7
    });
    
    console.log('\n🔍 ПОЛНЫЙ СЫРОЙ ОТВЕТ (JSON):');
    console.log('='.repeat(80));
    console.log(JSON.stringify(result, null, 2));
    
    console.log('\n📋 АНАЛИЗ СТРУКТУРЫ:');
    console.log('='.repeat(80));
    console.log('result.choices:', result.choices);
    console.log('result.choices[0]:', result.choices?.[0]);
    console.log('result.choices[0].message:', result.choices?.[0]?.message);
    console.log('result.choices[0].message.content:', result.choices?.[0]?.message?.content);
    console.log('result.choices[0].message.reasoning:', result.choices?.[0]?.message?.reasoning);
    
    console.log('\n📝 ВСЕ ВОЗМОЖНЫЕ ПОЛЯ:');
    console.log('='.repeat(80));
    if (result.choices?.[0]?.message) {
      const msg = result.choices[0].message;
      console.log('Все поля message:', Object.keys(msg));
      Object.keys(msg).forEach(key => {
        console.log(`${key}:`, msg[key]);
      });
    }
    
    console.log('\n🎯 ИТОГОВЫЙ ТЕКСТ:');
    console.log('='.repeat(80));
    const text = result?.choices?.[0]?.message?.content || 'НЕТ КОНТЕНТА';
    console.log('Текст:', text);
    console.log('Длина:', text.length);
    console.log('Тип:', typeof text);
    
    return result;
    
  } catch (error) {
    console.log(`❌ ОШИБКА: ${error.message}`);
    console.log('Stack:', error.stack);
    return null;
  }
}

async function main() {
  console.log('🔍 Детальный анализ switchpoint/router...\n');
  
  const result = await testSwitchpointRaw();
  
  if (result) {
    console.log('\n✅ Тест завершен успешно');
  } else {
    console.log('\n❌ Тест завершен с ошибкой');
  }
}

main().catch(console.error);

