const { Api } = require('telegram');
const { Database } = require('./database');

class ChannelManager {
  constructor() {
    this.db = new Database();
    this.client = null; // Будет инициализирован при подключении
    this.postingQueue = new Map(); // Очередь постинга
    this.rateLimits = new Map(); // Ограничения по частоте
  }

  // Инициализация с клиентом
  async init(telegramClient) {
    this.client = telegramClient;
    console.log('📺 Менеджер каналов инициализирован');
  }

  // Добавить канал для управления
  async addChannel(userId, channelId, channelName, topic = 'универсальный', style = 'универсальный') {
    try {
      // Проверяем права доступа к каналу
      const hasAccess = await this.checkChannelAccess(channelId);
      
      if (!hasAccess) {
        throw new Error('Нет доступа к каналу. Добавьте бота как администратора.');
      }

      // Сохраняем канал в БД
      const result = await this.db.createChannel(userId, channelId, channelName, topic, style);
      
      // Инициализируем настройки постинга
      await this.initChannelSettings(channelId);
      
      console.log(`✅ Канал ${channelName} добавлен для пользователя ${userId}`);
      return result;

    } catch (error) {
      console.error('Ошибка добавления канала:', error);
      throw error;
    }
  }

  // Проверка доступа к каналу
  async checkChannelAccess(channelId) {
    try {
      if (!this.client) return false;

      // Пытаемся получить информацию о канале
      const channel = await this.client.invoke(
        new Api.channels.GetChannels({ id: [channelId] })
      );

      // Проверяем права администратора
      const adminRights = await this.client.invoke(
        new Api.channels.GetParticipant({
          channel: channelId,
          participant: 'me'
        })
      );

      return adminRights && adminRights.participant?.adminRights?.postMessages;

    } catch (error) {
      console.error('Ошибка проверки доступа к каналу:', error);
      return false;
    }
  }

  // Инициализация настроек канала
  async initChannelSettings(channelId) {
    this.rateLimits.set(channelId, {
      lastPost: 0,
      minInterval: 30 * 60 * 1000, // 30 минут между постами
      dailyLimit: 10,
      dailyCount: 0,
      lastResetDate: new Date().toDateString()
    });
  }

  // Опубликовать пост в канал
  async postToChannel(channelId, content, options = {}) {
    try {
      // Проверяем лимиты
      if (!this.checkRateLimits(channelId)) {
        console.log(`⏰ Превышен лимит постинга для канала ${channelId}`);
        return false;
      }

      if (!this.client) {
        throw new Error('Telegram клиент не инициализирован');
      }

      // Формируем сообщение
      const message = this.formatMessage(content, options);

      // Отправляем пост
      const result = await this.client.invoke(
        new Api.messages.SendMessage({
          peer: channelId,
          message: message,
          parseMode: 'markdown'
        })
      );

      // Обновляем лимиты
      this.updateRateLimits(channelId);

      // Сохраняем пост в БД
      await this.db.savePost(channelId, message, content.originalText || null, content.style || null);

      console.log(`✅ Пост опубликован в канал ${channelId}`);
      return result;

    } catch (error) {
      console.error(`Ошибка публикации в канал ${channelId}:`, error);
      return false;
    }
  }

  // Проверка лимитов постинга
  checkRateLimits(channelId) {
    const limits = this.rateLimits.get(channelId);
    if (!limits) return true;

    const now = Date.now();
    const today = new Date().toDateString();

    // Сброс счетчика если новый день
    if (limits.lastResetDate !== today) {
      limits.dailyCount = 0;
      limits.lastResetDate = today;
    }

    // Проверка дневного лимита
    if (limits.dailyCount >= limits.dailyLimit) {
      return false;
    }

    // Проверка интервала между постами
    if (now - limits.lastPost < limits.minInterval) {
      return false;
    }

    return true;
  }

  // Обновление лимитов после поста
  updateRateLimits(channelId) {
    const limits = this.rateLimits.get(channelId);
    if (limits) {
      limits.lastPost = Date.now();
      limits.dailyCount += 1;
    }
  }

  // Форматирование сообщения
  formatMessage(content, options = {}) {
    let message = content.text || content;

    // Добавляем подпись бота если нужно
    if (options.addSignature) {
      message += '\n\n🤖 _Автопост от ContentBot_';
    }

    // Обрезаем если слишком длинно
    if (message.length > 4000) {
      message = message.substring(0, 3950) + '...';
    }

    return message;
  }

  // Запланировать пост
  async schedulePost(channelId, content, publishTime) {
    try {
      // Добавляем в очередь
      if (!this.postingQueue.has(channelId)) {
        this.postingQueue.set(channelId, []);
      }

      this.postingQueue.get(channelId).push({
        content,
        publishTime,
        id: Date.now()
      });

      console.log(`📅 Пост запланирован для канала ${channelId} на ${new Date(publishTime)}`);
      return true;

    } catch (error) {
      console.error('Ошибка планирования поста:', error);
      return false;
    }
  }

  // Обработка очереди постов
  async processPostingQueue() {
    const now = Date.now();

    for (let [channelId, queue] of this.postingQueue) {
      // Находим посты готовые к публикации
      const readyPosts = queue.filter(post => post.publishTime <= now);

      for (let post of readyPosts) {
        try {
          await this.postToChannel(channelId, post.content);
          
          // Удаляем из очереди
          const index = queue.findIndex(p => p.id === post.id);
          if (index > -1) {
            queue.splice(index, 1);
          }

        } catch (error) {
          console.error(`Ошибка публикации запланированного поста:`, error);
        }
      }
    }
  }

  // Получить статистику канала
  async getChannelStats(channelId) {
    try {
      const channel = await this.db.getQuery(
        'SELECT * FROM channels WHERE channel_id = ?',
        [channelId]
      );

      if (!channel) {
        return null;
      }

      const posts = await this.db.getChannelPosts(channelId, 30);
      const limits = this.rateLimits.get(channelId);

      return {
        ...channel,
        recentPosts: posts.length,
        todayPosts: limits?.dailyCount || 0,
        dailyLimit: limits?.dailyLimit || 10,
        lastPost: limits?.lastPost || 0,
        queueSize: this.postingQueue.get(channelId)?.length || 0
      };

    } catch (error) {
      console.error('Ошибка получения статистики канала:', error);
      return null;
    }
  }

  // Изменить настройки канала
  async updateChannelSettings(channelId, settings) {
    try {
      const { topic, style, dailyLimit, minInterval } = settings;

      // Обновляем в БД
      if (topic || style) {
        await this.db.runQuery(
          'UPDATE channels SET topic = COALESCE(?, topic), style = COALESCE(?, style) WHERE channel_id = ?',
          [topic, style, channelId]
        );
      }

      // Обновляем лимиты
      const limits = this.rateLimits.get(channelId);
      if (limits) {
        if (dailyLimit) limits.dailyLimit = dailyLimit;
        if (minInterval) limits.minInterval = minInterval * 60 * 1000; // в минутах
      }

      console.log(`⚙️ Настройки канала ${channelId} обновлены`);
      return true;

    } catch (error) {
      console.error('Ошибка обновления настроек канала:', error);
      return false;
    }
  }

  // Приостановить/возобновить канал
  async toggleChannelStatus(channelId, status) {
    try {
      await this.db.runQuery(
        'UPDATE channels SET status = ? WHERE channel_id = ?',
        [status, channelId]
      );

      console.log(`📺 Канал ${channelId} ${status === 'active' ? 'активирован' : 'приостановлен'}`);
      return true;

    } catch (error) {
      console.error('Ошибка изменения статуса канала:', error);
      return false;
    }
  }

  // Удалить канал
  async removeChannel(channelId, userId) {
    try {
      // Проверяем права
      const channel = await this.db.getQuery(
        'SELECT user_id FROM channels WHERE channel_id = ?',
        [channelId]
      );

      if (!channel || channel.user_id !== userId) {
        throw new Error('Нет прав для удаления канала');
      }

      // Удаляем из БД
      await this.db.runQuery('DELETE FROM channels WHERE channel_id = ?', [channelId]);

      // Очищаем лимиты и очереди
      this.rateLimits.delete(channelId);
      this.postingQueue.delete(channelId);

      // Уменьшаем счетчик каналов у пользователя
      await this.db.runQuery(
        'UPDATE users SET channels_count = channels_count - 1 WHERE telegram_id = ?',
        [userId]
      );

      console.log(`🗑️ Канал ${channelId} удален`);
      return true;

    } catch (error) {
      console.error('Ошибка удаления канала:', error);
      return false;
    }
  }

  // Получить все каналы пользователя
  async getUserChannels(userId) {
    try {
      const channels = await this.db.getUserChannels(userId);
      
      // Добавляем статистику к каждому каналу
      for (let channel of channels) {
        const stats = await this.getChannelStats(channel.channel_id);
        Object.assign(channel, stats);
      }

      return channels;

    } catch (error) {
      console.error('Ошибка получения каналов пользователя:', error);
      return [];
    }
  }

  // Массовая рассылка по каналам
  async broadcastToChannels(content, channelIds = []) {
    try {
      const results = [];

      for (let channelId of channelIds) {
        try {
          const result = await this.postToChannel(channelId, content);
          results.push({ channelId, success: !!result });
        } catch (error) {
          results.push({ channelId, success: false, error: error.message });
        }
      }

      return results;

    } catch (error) {
      console.error('Ошибка массовой рассылки:', error);
      return [];
    }
  }

  // Автоматическое определение лучшего времени для поста
  async getBestPostingTime(channelId) {
    try {
      // Анализируем статистику постов
      const posts = await this.db.allQuery(`
        SELECT posted_at, views, likes 
        FROM posts 
        WHERE channel_id = ? AND posted_at > strftime('%s', 'now', '-30 days')
        ORDER BY (views + likes * 10) DESC
        LIMIT 10
      `, [channelId]);

      if (posts.length < 3) {
        // Дефолтное время если нет данных
        return this.getDefaultPostingTime();
      }

      // Анализируем часы с лучшей активностью
      const hourStats = {};
      posts.forEach(post => {
        const hour = new Date(post.posted_at * 1000).getHours();
        if (!hourStats[hour]) hourStats[hour] = { count: 0, engagement: 0 };
        hourStats[hour].count++;
        hourStats[hour].engagement += (post.views || 0) + (post.likes || 0) * 10;
      });

      // Находим лучший час
      const bestHour = Object.entries(hourStats)
        .sort(([,a], [,b]) => b.engagement - a.engagement)[0][0];

      const now = new Date();
      const nextPost = new Date();
      nextPost.setHours(parseInt(bestHour), 0, 0, 0);
      
      // Если время уже прошло, планируем на завтра
      if (nextPost <= now) {
        nextPost.setDate(nextPost.getDate() + 1);
      }

      return nextPost.getTime();

    } catch (error) {
      console.error('Ошибка определения времени постинга:', error);
      return this.getDefaultPostingTime();
    }
  }

  // Дефолтное время постинга
  getDefaultPostingTime() {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000); // +1 час
    return nextHour.getTime();
  }

  // Получить общую статистику
  getManagerStats() {
    return {
      totalChannels: this.rateLimits.size,
      activeQueues: Array.from(this.postingQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      rateLimitsActive: this.rateLimits.size
    };
  }
}

module.exports = { ChannelManager }; 