const { OpenRouterManager } = require('../telegram_parser/dist/ai/openrouter-manager');

class LLMRewriter {
  constructor() {
    this.ai = OpenRouterManager.get();
    this.modelRouting = {
      primary: 'qwen/qwen-2.5-72b-instruct',
      style: 'meta-llama/llama-3.3-70b-instruct',
      coder: 'qwen/qwen-2.5-coder-32b-instruct',
      deeprewrite: 'deepseek/deepseek-v3.1',
      fast: 'mistralai/mistral-nemo',
    };
    
    // Стили написания для разных тематик
    this.writingStyles = {
      'мотивация': {
        tone: 'вдохновляющий и энергичный',
        emoji: '🔥💪⚡🎯🚀',
        keywords: ['успех', 'цель', 'мотивация', 'достижение', 'рост'],
        structure: 'начинай с вопроса или утверждения, добавляй личные примеры'
      },
      'бизнес': {
        tone: 'профессиональный и практичный',
        emoji: '💼📈💰🎯📊',
        keywords: ['стратегия', 'прибыль', 'эффективность', 'решение', 'результат'],
        structure: 'факты + практические советы + примеры'
      },
      'технологии': {
        tone: 'современный и информативный',
        emoji: '🤖💻📱⚙️🔬',
        keywords: ['инновации', 'технологии', 'будущее', 'разработка', 'цифровизация'],
        structure: 'объяснение простыми словами + перспективы'
      },
      'психология': {
        tone: 'понимающий и поддерживающий',
        emoji: '🧠💭🌟❤️🔮',
        keywords: ['понимание', 'эмоции', 'развитие', 'гармония', 'осознанность'],
        structure: 'проблема + объяснение + решение'
      },
      'универсальный': {
        tone: 'дружелюбный и познавательный',
        emoji: '✨🌟💫🎭🌈',
        keywords: ['жизнь', 'опыт', 'мудрость', 'познание', 'развитие'],
        structure: 'история + мораль + применение'
      }
    };
  }

  selectModel(task, content = '', style = 'универсальный') {
    if (task === 'rewrite') {
      if (content && content.length > 1200) return this.modelRouting.deeprewrite;
      if (style === 'технологии') return this.modelRouting.coder;
      return this.modelRouting.primary;
    }
    if (task === 'generate') {
      // Креатив по умолчанию, техники/бизнес — точность
      if (style === 'технологии' || style === 'бизнес') return this.modelRouting.primary;
      return this.modelRouting.style;
    }
    if (task === 'improve') {
      return this.modelRouting.primary;
    }
    return this.modelRouting.fast;
  }

  // Основная функция переписывания контента
  async rewriteContent(content, style = 'универсальный') {
    try {
      const styleConfig = this.writingStyles[style] || this.writingStyles['универсальный'];
      
      const prompt = this.buildPrompt(content.text, styleConfig, style);
      
      const model = this.selectModel('rewrite', content.text, style);
      const response = await this.ai.makeRequest([
        {
          role: "system",
          content: `Ты профессиональный копирайтер для Telegram каналов. 
          Переписывай контент, делая его уникальным, вовлекающим и ценным.
          ОБЯЗАТЕЛЬНО соблюдай стиль и тон, указанный в промпте.
          НЕ копируй оригинальный текст, создавай новый на основе идеи.
          ОТВЕТ ДОЛЖЕН БЫТЬ КОРОТКИМ - максимум 2-3 предложения!`
        },
        {
          role: "user", 
          content: prompt
        }
      ], model, { max_tokens: 220, temperature: 0.7 });

      let rewrittenText = response.choices[0].message.content.trim();
      
      // Добавляем эмодзи и форматирование
      rewrittenText = this.enhanceWithEmojis(rewrittenText, styleConfig);
      
      // Добавляем CTA (призыв к действию)
      rewrittenText = this.addCallToAction(rewrittenText, style);
      
      return {
        text: rewrittenText,
        originalLength: content.text.length,
        rewrittenLength: rewrittenText.length,
        style: style,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Ошибка переписывания контента:', error);
      
      // Fallback - простая обработка текста
      return this.fallbackRewrite(content.text, style);
    }
  }

  // Построение промпта для LLM
  buildPrompt(originalText, styleConfig, style) {
    return `
ЗАДАЧА: Переписать этот текст в стиле "${style}"

ОРИГИНАЛЬНЫЙ ТЕКСТ:
"${originalText}"

ТРЕБОВАНИЯ:
- Тон: ${styleConfig.tone}
- Структура: ${styleConfig.structure}
- Ключевые слова для использования: ${styleConfig.keywords.join(', ')}
- Длина: 500-1500 символов
- Язык: русский
- Аудитория: подписчики Telegram канала

ПРАВИЛА:
1. НЕ копируй оригинальный текст дословно
2. Сохрани основную идею, но изложи по-новому
3. Используй современный живой язык
4. Добавь конкретные примеры или факты
5. Сделай текст практичным и полезным
6. НЕ добавляй эмодзи (их добавлю отдельно)

ПЕРЕПИСАННЫЙ ТЕКСТ:`;
  }

  // Добавление эмодзи по стилю
  enhanceWithEmojis(text, styleConfig) {
    const emojis = styleConfig.emoji.split('');
    const sentences = text.split(/[.!?]/);
    
    let enhanced = '';
    sentences.forEach((sentence, index) => {
      if (sentence.trim()) {
        // Добавляем эмодзи в начало некоторых предложений
        if (index % 2 === 0 && emojis.length > 0) {
          const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
          enhanced += `${randomEmoji} ${sentence.trim()}. `;
        } else {
          enhanced += `${sentence.trim()}. `;
        }
      }
    });
    
    return enhanced.trim();
  }

  // Добавление призыва к действию
  addCallToAction(text, style) {
    const ctas = {
      'мотивация': [
        '\n\n🔥 А как ты мотивируешь себя? Поделись в комментариях!',
        '\n\n💪 Сохрани пост, чтобы не забыть!',
        '\n\n⚡ Поставь ❤️ если согласен!'
      ],
      'бизнес': [
        '\n\n📈 Какой опыт в бизнесе у тебя? Расскажи!',
        '\n\n💰 Сохрани пост для применения!',
        '\n\n🎯 А ты применяешь эти принципы?'
      ],
      'технологии': [
        '\n\n🤖 Что думаешь об этой технологии?',
        '\n\n💻 Используешь подобные решения?',
        '\n\n🔬 Поделись своим мнением!'
      ],
      'универсальный': [
        '\n\n✨ А как ты применяешь это в жизни?',
        '\n\n🌟 Согласен? Ставь ❤️',
        '\n\n💫 Поделись своим опытом!'
      ]
    };

    const styleCtas = ctas[style] || ctas['универсальный'];
    const randomCta = styleCtas[Math.floor(Math.random() * styleCtas.length)];
    
    return text + randomCta;
  }

  // Fallback при ошибке API
  fallbackRewrite(originalText, style) {
    const templates = {
      'мотивация': '🔥 Каждый день — это новая возможность изменить свою жизнь!\n\n',
      'бизнес': '📈 В бизнесе важно думать стратегически:\n\n',
      'технологии': '💻 Современные технологии открывают новые горизонты:\n\n',
      'универсальный': '✨ Интересный факт, который стоит знать:\n\n'
    };

    const template = templates[style] || templates['универсальный'];
    const shortened = originalText.substring(0, 800) + '...';
    
    return {
      text: template + shortened + '\n\n💭 А что думаешь ты?',
      originalLength: originalText.length,
      rewrittenLength: (template + shortened).length,
      style: style,
      timestamp: Date.now(),
      fallback: true
    };
  }

  // Генерация контента с нуля по теме
  async generateFromScratch(topic, style = 'универсальный') {
    try {
      const styleConfig = this.writingStyles[style] || this.writingStyles['универсальный'];
      
      const prompt = `
Создай оригинальный пост для Telegram канала на тему "${topic}".

СТИЛЬ: ${style}
ТОН: ${styleConfig.tone}
СТРУКТУРА: ${styleConfig.structure}
КЛЮЧЕВЫЕ СЛОВА: ${styleConfig.keywords.join(', ')}

ТРЕБОВАНИЯ:
- Длина: 100-200 символов (КОРОТКИЙ ПОСТ!)
- Полезная информация или инсайт
- Вовлекающий контент
- Современный язык

ПОСТ:`;

      const model = this.selectModel('generate', '', style);
      const response = await this.ai.makeRequest([
        {
          role: "system",
          content: "Ты профессиональный копирайтер для Telegram каналов. Создавай вовлекающий и полезный контент. ОТВЕТ ДОЛЖЕН БЫТЬ КОРОТКИМ - максимум 2-3 предложения!"
        },
        {
          role: "user",
          content: prompt
        }
      ], model, { max_tokens: 220, temperature: 0.7 });

      let generatedText = response.choices[0].message.content.trim();
      generatedText = this.enhanceWithEmojis(generatedText, styleConfig);
      generatedText = this.addCallToAction(generatedText, style);

      return {
        text: generatedText,
        topic: topic,
        style: style,
        generated: true,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Ошибка генерации контента:', error);
      return null;
    }
  }

  // Анализ и улучшение существующего поста
  async improvePost(text, targetMetrics = {}) {
    try {
      const prompt = `
Улучши этот пост для Telegram канала:

ОРИГИНАЛ:
"${text}"

ЦЕЛИ:
- Больше вовлечения
- Лучшая читаемость  
- Более практичная польза
- Увеличение комментариев

УЛУЧШЕННАЯ ВЕРСИЯ:`;

      const model = this.selectModel('improve');
      const response = await this.ai.makeRequest([
        {
          role: "system",
          content: "Ты эксперт по Telegram контенту. Улучшай посты для максимального вовлечения."
        },
        {
          role: "user",
          content: prompt
        }
      ], model, { max_tokens: 220, temperature: 0.6 });

      return {
        improved: response.choices[0].message.content.trim(),
        original: text,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Ошибка улучшения поста:', error);
      return { improved: text, original: text };
    }
  }

  // Получить статистику работы
  getStats() {
    return {
      availableStyles: Object.keys(this.writingStyles),
      supportedFeatures: [
        'rewrite_content',
        'generate_from_scratch', 
        'improve_existing',
        'emoji_enhancement',
        'cta_addition'
      ]
    };
  }
}

module.exports = { LLMRewriter }; 