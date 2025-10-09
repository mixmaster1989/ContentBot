const fs = require('fs');
const path = require('path');

class AnalysisDashboard {
  constructor(jsonFile) {
    this.analysis = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  }

  // Красивый вывод анализа
  displayAnalysis() {
    console.log('\n' + '='.repeat(80));
    console.log(`📊 АНАЛИЗ КАНАЛА: ${this.analysis.channel_name}`);
    console.log('='.repeat(80));
    
    this.displaySentiment();
    this.displayUniqueness();
    this.displayEntities();
    this.displayRecommendations();
  }

  displaySentiment() {
    const sent = this.analysis.sentiment_analysis;
    console.log('\n🎯 ПОЛИТИЧЕСКИЙ АНАЛИЗ');
    console.log('─'.repeat(50));
    console.log(`📈 Ориентация: ${sent.orientation.toUpperCase()}`);
    console.log(`📊 Балл: ${sent.sentiment_score}/100`);
    console.log(`🎯 Уверенность: ${sent.confidence}`);
    console.log(`👀 Просмотры: ${sent.total_views.toLocaleString()}`);
    console.log(`📝 Сообщений проанализировано: ${sent.messages_analyzed}`);
    
    console.log('\n🔥 Ключевые темы:');
    sent.key_topics.forEach((topic, i) => {
      console.log(`   ${i + 1}. ${topic}`);
    });
  }

  displayUniqueness() {
    const uniq = this.analysis.uniqueness_analysis;
    console.log('\n💎 АНАЛИЗ УНИКАЛЬНОСТИ');
    console.log('─'.repeat(50));
    console.log(`⭐ Общая уникальность: ${uniq.uniqueness_score}/100`);
    console.log(`🎨 Оригинальность: ${uniq.originality}/100`);
    console.log(`🔒 Эксклюзивность: ${uniq.exclusivity}/100`);
    console.log(`📅 Свежесть контента: ${uniq.content_freshness}/100`);
    
    console.log('\n✨ Уникальные темы:');
    uniq.unique_topics.slice(0, 3).forEach((topic, i) => {
      console.log(`   ${i + 1}. ${topic}`);
    });
  }

  displayEntities() {
    const entities = this.analysis.entities_analysis;
    console.log('\n🏷️ АНАЛИЗ СУЩНОСТЕЙ');
    console.log('─'.repeat(50));
    
    if (entities.people.length > 0) {
      console.log(`👥 Люди: ${entities.people.join(', ')}`);
    }
    if (entities.organizations.length > 0) {
      console.log(`🏢 Организации: ${entities.organizations.join(', ')}`);
    }
    if (entities.countries.length > 0) {
      console.log(`🌍 Страны: ${entities.countries.join(', ')}`);
    }
    
    if (entities.people.length === 0 && entities.organizations.length === 0 && entities.countries.length === 0) {
      console.log('⚠️ Анализ сущностей не завершен');
    }
  }

  displayRecommendations() {
    const uniq = this.analysis.uniqueness_analysis;
    console.log('\n💡 РЕКОМЕНДАЦИИ ДЛЯ УЛУЧШЕНИЯ');
    console.log('─'.repeat(50));
    uniq.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }

  // Экспорт в разные форматы
  exportToMarkdown() {
    const sent = this.analysis.sentiment_analysis;
    const uniq = this.analysis.uniqueness_analysis;
    
    let markdown = `# Анализ канала "${this.analysis.channel_name}"\n\n`;
    markdown += `**Дата анализа:** ${this.analysis.analysis_date}\n`;
    markdown += `**Время анализа:** ${this.analysis.analysis_duration_seconds} секунд\n\n`;
    
    markdown += `## 🎯 Политический анализ\n`;
    markdown += `- **Ориентация:** ${sent.orientation}\n`;
    markdown += `- **Балл:** ${sent.sentiment_score}/100\n`;
    markdown += `- **Уверенность:** ${sent.confidence}\n`;
    markdown += `- **Просмотры:** ${sent.total_views.toLocaleString()}\n\n`;
    
    markdown += `## 💎 Уникальность контента\n`;
    markdown += `- **Общая уникальность:** ${uniq.uniqueness_score}/100\n`;
    markdown += `- **Оригинальность:** ${uniq.originality}/100\n`;
    markdown += `- **Эксклюзивность:** ${uniq.exclusivity}/100\n\n`;
    
    return markdown;
  }

  // Получить метрики для API
  getMetrics() {
    return {
      channel: this.analysis.channel_name,
      political_orientation: this.analysis.sentiment_analysis.orientation,
      political_score: this.analysis.sentiment_analysis.sentiment_score,
      uniqueness_score: this.analysis.uniqueness_analysis.uniqueness_score,
      total_views: this.analysis.sentiment_analysis.total_views,
      messages_analyzed: this.analysis.sentiment_analysis.messages_analyzed,
      analysis_date: this.analysis.analysis_date
    };
  }
}

// Использование
if (require.main === module) {
  const dashboard = new AnalysisDashboard('full_ai_analysis_2025-09-16T07-02-25-264Z.json');
  dashboard.displayAnalysis();
  
  // Экспорт в markdown
  const markdown = dashboard.exportToMarkdown();
  fs.writeFileSync('analysis_report.md', markdown);
  console.log('\n📄 Отчет сохранен в analysis_report.md');
}

module.exports = AnalysisDashboard;
