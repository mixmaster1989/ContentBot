require('dotenv').config();

console.log('🔍 Тестирование загрузки переменных окружения...\n');

const requiredVars = [
  'BOT_TOKEN',
  'API_ID', 
  'API_HASH',
  'MONTHLY_PRICE',
  'CHANNEL_SETUP_PRICE',
  'PREMIUM_PRICE'
];

console.log('📋 Проверка переменных:');
for (let varName of requiredVars) {
  const value = process.env[varName];
  if (value) {
    // Скрываем чувствительные данные
    if (varName.includes('TOKEN') || varName.includes('KEY') || varName.includes('HASH')) {
      console.log(`  ✅ ${varName}: [СКРЫТО - ${value.length} символов]`);
    } else {
      console.log(`  ✅ ${varName}: ${value}`);
    }
  } else {
    console.log(`  ❌ ${varName}: НЕ НАЙДЕНА`);
  }
}

console.log('\n📊 Общее количество переменных в process.env:', Object.keys(process.env).length);

console.log('\n🔍 Проверка наличия .env файла:');
const fs = require('fs');
if (fs.existsSync('.env')) {
  console.log('  ✅ .env файл существует');
  const content = fs.readFileSync('.env', 'utf8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  console.log(`  📋 Строк с переменными: ${lines.length}`);
} else {
  console.log('  ❌ .env файл не найден');
}

console.log('\n✅ Тест завершен');


