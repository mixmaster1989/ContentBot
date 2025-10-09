const axios = require('axios');
const crypto = require('crypto');
const { Database } = require('../core/database');

class PaymentSystem {
  constructor() {
    this.db = new Database();
    this.yoomoneyToken = process.env.YOOMONEY_TOKEN;
    this.cryptoWallet = process.env.CRYPTO_WALLET;
    
    // Тарифы
    this.prices = {
      monthly: parseInt(process.env.MONTHLY_PRICE) || 3000,
      setup: parseInt(process.env.CHANNEL_SETUP_PRICE) || 10000,
      premium: parseInt(process.env.PREMIUM_PRICE) || 15000
    };
  }

  // Создание платежа через ЮMoney
  async createYooMoneyPayment(userId, amount, serviceType = 'monthly') {
    try {
      const paymentId = this.generatePaymentId();
      const label = `contentbot_${userId}_${Date.now()}`;

      // Сохраняем платеж в БД
      await this.db.createPayment(userId, amount, 'yoomoney', serviceType, paymentId);

      // Формируем ссылку для оплаты
      const paymentUrl = `https://yoomoney.ru/quickpay/shop-widget?targets=ContentBot%20${serviceType}&default-sum=${amount}&button-text=11&any-card-payment-type=on&button-size=m&button-color=orange&successURL=https://t.me/your_contentbot&label=${label}`;

      console.log(`💰 Создан платеж ЮMoney: ${paymentId} на сумму ${amount}₽`);
      
      return {
        paymentId,
        paymentUrl,
        amount,
        label
      };

    } catch (error) {
      console.error('Ошибка создания платежа ЮMoney:', error);
      throw error;
    }
  }

  // Создание криптоплатежа
  async createCryptoPayment(userId, amount, serviceType = 'monthly') {
    try {
      const paymentId = this.generatePaymentId();
      
      // Сохраняем платеж в БД
      await this.db.createPayment(userId, amount, 'crypto', serviceType, paymentId);

      const cryptoAmount = this.convertToCrypto(amount);

      console.log(`₿ Создан криптоплатеж: ${paymentId} на сумму ${amount}₽`);

      return {
        paymentId,
        wallet: this.cryptoWallet,
        amount: cryptoAmount,
        instructions: `Переведите ${cryptoAmount} USDT на кошелек:\n${this.cryptoWallet}\n\nВ комментарии укажите: ${paymentId}\n\nПосле оплаты отправьте скриншот админу.`
      };

    } catch (error) {
      console.error('Ошибка создания криптоплатежа:', error);
      throw error;
    }
  }

  // Проверка платежей ЮMoney через webhook/API
  async checkYooMoneyPayments() {
    try {
      // Получаем неподтвержденные платежи
      const pendingPayments = await this.db.getPendingPayments();
      const yoomoneyPayments = pendingPayments.filter(p => p.payment_method === 'yoomoney');

      for (let payment of yoomoneyPayments) {
        // Здесь должна быть проверка через API ЮMoney
        // Пока делаем mock проверку
        const isConfirmed = await this.mockYooMoneyCheck(payment.payment_id);
        
        if (isConfirmed) {
          await this.confirmPayment(payment.user_id, payment.payment_id, payment.service_type);
        }
      }

    } catch (error) {
      console.error('Ошибка проверки платежей ЮMoney:', error);
    }
  }

  // Mock проверка ЮMoney (заменить на реальную проверку)
  async mockYooMoneyCheck(paymentId) {
    // В реальности здесь запрос к API ЮMoney
    return Math.random() > 0.8; // 20% вероятность подтверждения для теста
  }

  // Подтверждение платежа
  async confirmPayment(userId, paymentId, serviceType) {
    try {
      // Обновляем статус платежа
      await this.db.updatePaymentStatus(paymentId, 'completed');

      // Активируем подписку
      await this.activateSubscription(userId, serviceType);

      console.log(`✅ Платеж ${paymentId} подтвержден для пользователя ${userId}`);

      return true;
    } catch (error) {
      console.error('Ошибка подтверждения платежа:', error);
      return false;
    }
  }

  // Активация подписки
  async activateSubscription(userId, serviceType) {
    try {
      let expiresAt = null;
      let status = 'free';

      switch (serviceType) {
        case 'monthly':
          expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 дней
          status = 'premium';
          break;
        case 'premium':
          expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 дней
          status = 'vip';
          break;
        case 'setup':
          // Разовая услуга настройки
          status = 'setup_paid';
          break;
      }

      await this.db.updateUserSubscription(userId, status, expiresAt);

      // Отправляем уведомление пользователю
      await this.notifyPaymentSuccess(userId, serviceType);

      console.log(`🎉 Подписка ${serviceType} активирована для пользователя ${userId}`);

    } catch (error) {
      console.error('Ошибка активации подписки:', error);
    }
  }

  // Уведомление об успешной оплате
  async notifyPaymentSuccess(userId, serviceType) {
    try {
      // Здесь отправка сообщения через бота
      const messages = {
        monthly: '🎉 Поздравляем! Подписка на ведение канала активирована на 30 дней!',
        premium: '🎉 VIP подписка активирована! Доступны все функции!',
        setup: '🎉 Оплата за настройку канала получена! Наш менеджер свяжется с вами.'
      };

      const message = messages[serviceType] || 'Платеж успешно обработан!';
      
      // TODO: Интеграция с ботом для отправки сообщения
      console.log(`📱 Уведомление для ${userId}: ${message}`);

    } catch (error) {
      console.error('Ошибка отправки уведомления:', error);
    }
  }

  // Проверка действительности подписки
  async checkSubscription(userId) {
    try {
      const user = await this.db.getUser(userId);
      
      if (!user) return { valid: false, status: 'not_found' };

      const now = Math.floor(Date.now() / 1000);
      
      if (user.subscription_expires && user.subscription_expires < now) {
        // Подписка истекла
        await this.db.updateUserSubscription(userId, 'expired', null);
        return { valid: false, status: 'expired' };
      }

      return { 
        valid: user.subscription_status !== 'free',
        status: user.subscription_status,
        expiresAt: user.subscription_expires
      };

    } catch (error) {
      console.error('Ошибка проверки подписки:', error);
      return { valid: false, status: 'error' };
    }
  }

  // Генерация уникального ID платежа
  generatePaymentId() {
    return 'cb_' + crypto.randomBytes(8).toString('hex');
  }

  // Конвертация рублей в крипту (USDT)
  convertToCrypto(rubAmount) {
    const usdtRate = 92; // Примерный курс рубль/USDT
    return Math.round((rubAmount / usdtRate) * 100) / 100;
  }

  // Создание QR кода для платежа
  async generatePaymentQR(paymentData) {
    try {
      const QRCode = require('qrcode');
      const qrData = JSON.stringify(paymentData);
      const qrCode = await QRCode.toDataURL(qrData);
      
      return qrCode;
    } catch (error) {
      console.error('Ошибка генерации QR кода:', error);
      return null;
    }
  }

  // Статистика платежей
  async getPaymentStats(days = 30) {
    try {
      const stats = await this.db.allQuery(`
        SELECT 
          payment_method,
          service_type,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM payments 
        WHERE status = 'completed' 
          AND created_at > strftime('%s', 'now', '-${days} days')
        GROUP BY payment_method, service_type
      `);

      const totalRevenue = await this.db.getQuery(`
        SELECT SUM(amount) as total
        FROM payments 
        WHERE status = 'completed'
          AND created_at > strftime('%s', 'now', '-${days} days')
      `);

      return {
        stats,
        totalRevenue: totalRevenue?.total || 0,
        period: `${days} дней`
      };

    } catch (error) {
      console.error('Ошибка получения статистики платежей:', error);
      return null;
    }
  }

  // Возврат платежа
  async refundPayment(paymentId, reason = '') {
    try {
      await this.db.runQuery(
        `UPDATE payments SET status = 'refunded' WHERE payment_id = ?`,
        [paymentId]
      );

      console.log(`💸 Возврат платежа ${paymentId}: ${reason}`);
      return true;

    } catch (error) {
      console.error('Ошибка возврата платежа:', error);
      return false;
    }
  }

  // Применение промокода
  async applyPromoCode(userId, promoCode) {
    const promoCodes = {
      'FIRST50': { discount: 50, type: 'percent' },
      'START1000': { discount: 1000, type: 'fixed' },
      'PREMIUM30': { discount: 30, type: 'percent' }
    };

    const promo = promoCodes[promoCode.toUpperCase()];
    
    if (!promo) {
      return { success: false, message: 'Промокод не найден' };
    }

    // Проверяем, использовал ли пользователь промокод ранее
    const used = await this.db.getQuery(
      `SELECT id FROM payments WHERE user_id = ? AND payment_id LIKE '%promo%'`,
      [userId]
    );

    if (used) {
      return { success: false, message: 'Промокод уже использован' };
    }

    return { 
      success: true, 
      discount: promo.discount,
      type: promo.type,
      message: `Промокод применен! Скидка: ${promo.discount}${promo.type === 'percent' ? '%' : '₽'}`
    };
  }

  // Проверка всех платежей (запуск по крону)
  async checkPayments() {
    console.log('🔄 Проверка платежей...');
    
    await this.checkYooMoneyPayments();
    
    // Проверка истекших подписок
    await this.checkExpiredSubscriptions();
    
    console.log('✅ Проверка платежей завершена');
  }

  // Проверка истекших подписок
  async checkExpiredSubscriptions() {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      await this.db.runQuery(`
        UPDATE users 
        SET subscription_status = 'expired' 
        WHERE subscription_expires < ? AND subscription_status != 'expired'
      `, [now]);

      console.log('🕒 Проверка истекших подписок выполнена');

    } catch (error) {
      console.error('Ошибка проверки истекших подписок:', error);
    }
  }

  // Получить тарифы
  getPrices() {
    return this.prices;
  }
}

module.exports = { PaymentSystem }; 