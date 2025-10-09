const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/contentbot.db');
    this.db = null;
  }

  async init() {
    try {
      // Создаем папку data если не существует
      const dataDir = path.dirname(this.dbPath);
      await fs.mkdir(dataDir, { recursive: true });

      // Подключаемся к базе данных
      this.db = new sqlite3.Database(this.dbPath);
      
      // Создаем таблицы
      await this.createTables();
      
      console.log('✅ База данных инициализирована');
    } catch (error) {
      console.error('❌ Ошибка инициализации БД:', error);
      throw error;
    }
  }

  async createTables() {
    const queries = [
      // Таблица пользователей
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        telegram_id INTEGER UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        subscription_status TEXT DEFAULT 'free',
        subscription_expires INTEGER,
        channels_count INTEGER DEFAULT 0,
        total_paid REAL DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        last_active INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Таблица каналов
      `CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        channel_id TEXT UNIQUE NOT NULL,
        channel_name TEXT NOT NULL,
        topic TEXT DEFAULT 'универсальный',
        style TEXT DEFAULT 'универсальный',
        status TEXT DEFAULT 'pending',
        posts_today INTEGER DEFAULT 0,
        posts_total INTEGER DEFAULT 0,
        last_post_time INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (user_id) REFERENCES users (telegram_id)
      )`,

      // Таблица постов
      `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        original_content TEXT,
        style TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        posted_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (channel_id) REFERENCES channels (id)
      )`,

      // Таблица платежей
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'RUB',
        payment_method TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_id TEXT,
        service_type TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        completed_at INTEGER,
        FOREIGN KEY (user_id) REFERENCES users (telegram_id)
      )`,

      // Таблица контента источников
      `CREATE TABLE IF NOT EXISTS content_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_username TEXT NOT NULL,
        topic TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        last_parsed INTEGER,
        success_rate REAL DEFAULT 0,
        added_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`,

      // Таблица статистики
      `CREATE TABLE IF NOT EXISTS statistics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        total_users INTEGER DEFAULT 0,
        active_channels INTEGER DEFAULT 0,
        posts_generated INTEGER DEFAULT 0,
        revenue REAL DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )`
    ];

    for (let query of queries) {
      await this.runQuery(query);
    }
  }

  // Вспомогательная функция для выполнения запросов
  runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  // Вспомогательная функция для получения данных
  getQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Вспомогательная функция для получения множественных данных
  allQuery(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // ПОЛЬЗОВАТЕЛИ
  async createUser(telegramId, username = null, firstName = null) {
    try {
      await this.runQuery(
        `INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)`,
        [telegramId, username, firstName]
      );
      return await this.getUser(telegramId);
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      return null;
    }
  }

  async getUser(telegramId) {
    return await this.getQuery(
      `SELECT * FROM users WHERE telegram_id = ?`,
      [telegramId]
    );
  }

  async updateUserSubscription(telegramId, status, expiresAt = null) {
    return await this.runQuery(
      `UPDATE users SET subscription_status = ?, subscription_expires = ? WHERE telegram_id = ?`,
      [status, expiresAt, telegramId]
    );
  }

  async updateLastActive(telegramId) {
    return await this.runQuery(
      `UPDATE users SET last_active = strftime('%s', 'now') WHERE telegram_id = ?`,
      [telegramId]
    );
  }

  // КАНАЛЫ
  async createChannel(userId, channelId, channelName, topic = 'универсальный', style = 'универсальный') {
    try {
      const result = await this.runQuery(
        `INSERT INTO channels (user_id, channel_id, channel_name, topic, style, status) VALUES (?, ?, ?, ?, ?, 'active')`,
        [userId, channelId, channelName, topic, style]
      );
      
      // Увеличиваем счетчик каналов у пользователя
      await this.runQuery(
        `UPDATE users SET channels_count = channels_count + 1 WHERE telegram_id = ?`,
        [userId]
      );
      
      return result;
    } catch (error) {
      console.error('Ошибка создания канала:', error);
      return null;
    }
  }

  async getUserChannels(telegramId) {
    return await this.allQuery(
      `SELECT * FROM channels WHERE user_id = ? ORDER BY created_at DESC`,
      [telegramId]
    );
  }

  async getActiveChannels() {
    return await this.allQuery(
      `SELECT * FROM channels WHERE status = 'active'`
    );
  }

  async incrementPostCount(channelId) {
    return await this.runQuery(
      `UPDATE channels SET posts_today = posts_today + 1, posts_total = posts_total + 1, last_post_time = strftime('%s', 'now') WHERE id = ?`,
      [channelId]
    );
  }

  async resetDailyPostCounts() {
    return await this.runQuery(
      `UPDATE channels SET posts_today = 0`
    );
  }

  // ПОСТЫ
  async savePost(channelId, content, originalContent = null, style = null) {
    return await this.runQuery(
      `INSERT INTO posts (channel_id, content, original_content, style) VALUES (?, ?, ?, ?)`,
      [channelId, content, originalContent, style]
    );
  }

  async getChannelPosts(channelId, limit = 10) {
    return await this.allQuery(
      `SELECT * FROM posts WHERE channel_id = ? ORDER BY posted_at DESC LIMIT ?`,
      [channelId, limit]
    );
  }

  async updatePostStats(postId, views = null, likes = null, comments = null) {
    const updates = [];
    const params = [];
    
    if (views !== null) {
      updates.push('views = ?');
      params.push(views);
    }
    if (likes !== null) {
      updates.push('likes = ?');
      params.push(likes);
    }
    if (comments !== null) {
      updates.push('comments = ?');
      params.push(comments);
    }
    
    if (updates.length === 0) return;
    
    params.push(postId);
    
    return await this.runQuery(
      `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
  }

  // ПЛАТЕЖИ
  async createPayment(userId, amount, paymentMethod, serviceType, paymentId = null) {
    return await this.runQuery(
      `INSERT INTO payments (user_id, amount, payment_method, service_type, payment_id) VALUES (?, ?, ?, ?, ?)`,
      [userId, amount, paymentMethod, serviceType, paymentId]
    );
  }

  async updatePaymentStatus(paymentId, status) {
    const completedAt = status === 'completed' ? Math.floor(Date.now() / 1000) : null;
    
    return await this.runQuery(
      `UPDATE payments SET status = ?, completed_at = ? WHERE payment_id = ?`,
      [status, completedAt, paymentId]
    );
  }

  async getUserPayments(telegramId) {
    return await this.allQuery(
      `SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC`,
      [telegramId]
    );
  }

  async getPendingPayments() {
    return await this.allQuery(
      `SELECT * FROM payments WHERE status = 'pending'`
    );
  }

  // ИСТОЧНИКИ КОНТЕНТА
  async addContentSource(channelUsername, topic) {
    return await this.runQuery(
      `INSERT OR IGNORE INTO content_sources (channel_username, topic) VALUES (?, ?)`,
      [channelUsername, topic]
    );
  }

  async getContentSources(topic = null) {
    if (topic) {
      return await this.allQuery(
        `SELECT * FROM content_sources WHERE topic = ? AND active = 1`,
        [topic]
      );
    } else {
      return await this.allQuery(
        `SELECT * FROM content_sources WHERE active = 1`
      );
    }
  }

  async updateSourceStats(sourceId, successRate) {
    return await this.runQuery(
      `UPDATE content_sources SET success_rate = ?, last_parsed = strftime('%s', 'now') WHERE id = ?`,
      [successRate, sourceId]
    );
  }

  // СТАТИСТИКА
  async saveStatistics(date, data) {
    return await this.runQuery(
      `INSERT OR REPLACE INTO statistics (date, total_users, active_channels, posts_generated, revenue) VALUES (?, ?, ?, ?, ?)`,
      [date, data.totalUsers, data.activeChannels, data.postsGenerated, data.revenue]
    );
  }

  async getStatistics(days = 30) {
    return await this.allQuery(
      `SELECT * FROM statistics ORDER BY date DESC LIMIT ?`,
      [days]
    );
  }

  // ОБЩИЕ ФУНКЦИИ
  async getTotalStats() {
    const result = await this.getQuery(`
      SELECT 
        COUNT(DISTINCT u.telegram_id) as total_users,
        COUNT(DISTINCT c.id) as total_channels,
        COUNT(DISTINCT p.id) as total_posts,
        SUM(pay.amount) as total_revenue
      FROM users u
      LEFT JOIN channels c ON u.telegram_id = c.user_id
      LEFT JOIN posts p ON c.id = p.channel_id
      LEFT JOIN payments pay ON u.telegram_id = pay.user_id AND pay.status = 'completed'
    `);
    
    return result || {
      total_users: 0,
      total_channels: 0,
      total_posts: 0,
      total_revenue: 0
    };
  }

  async cleanup() {
    // Очистка старых записей (можно вызывать периодически)
    await this.runQuery(`DELETE FROM posts WHERE posted_at < strftime('%s', 'now', '-30 days')`);
    await this.runQuery(`DELETE FROM statistics WHERE created_at < strftime('%s', 'now', '-90 days')`);
    console.log('✅ Очистка базы данных выполнена');
  }

  async close() {
    if (this.db) {
      this.db.close();
      console.log('🛑 База данных закрыта');
    }
  }
}

module.exports = { Database }; 