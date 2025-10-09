#!/usr/bin/env python3
"""
🔑 ContentBot - Экстрактор API ключей
Автоматически собирает все нужные ключи из IKAR и telegram_parser проектов
"""

import os
import json
import shutil
from pathlib import Path
from datetime import datetime

class KeyExtractor:
    def __init__(self):
        self.home_dir = Path("/home/user1")
        self.ikar_dir = self.home_dir / "IKAR"
        self.parser_dir = self.home_dir / "telegram_parser"
        self.contentbot_dir = self.home_dir / "ContentBot"
        
        self.extracted_keys = {}
        self.session_data = None
        
    def extract_from_ikar(self):
        """Извлекает ключи из IKAR проекта"""
        print("🔍 Анализирую IKAR проект...")
        
        ikar_env = self.ikar_dir / ".env"
        if ikar_env.exists():
            with open(ikar_env, 'r') as f:
                content = f.read()
                
            print(f"📁 Найден IKAR .env файл ({len(content)} символов)")
            
            # Извлекаем ключи
            lines = content.strip().split('\n')
            for line in lines:
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    
                    # Мапим ключи IKAR в нужные для ContentBot
                    if key.startswith('OPENROUTER_API_KEY'):
                        if key == 'OPENROUTER_API_KEY1' or key == 'OPENROUTER_API_KEY':
                            self.extracted_keys['OPENAI_API_KEY'] = value
                            print(f"✅ OpenAI API ключ найден: {value[:20]}...")
                    
                    elif key == 'TELEGRAM_BOT_TOKEN':
                        self.extracted_keys['TELEGRAM_BOT_TOKEN'] = value
                        print(f"✅ Telegram Bot Token найден: {value[:20]}...")
                    
                    elif key == 'LLM_API':
                        self.extracted_keys['LLM_API'] = value
                        print(f"✅ LLM API ключ найден: {value[:20]}...")
                    
                    elif key.startswith('ELEVEN_API'):
                        if 'ELEVEN_API_KEYS' not in self.extracted_keys:
                            self.extracted_keys['ELEVEN_API_KEYS'] = []
                        self.extracted_keys['ELEVEN_API_KEYS'].append(value)
                        
        else:
            print("❌ IKAR .env файл не найден")
    
    def extract_from_telegram_parser(self):
        """Извлекает ключи и сессию из telegram_parser"""
        print("🔍 Анализирую telegram_parser проект...")
        
        # Извлекаем .env
        parser_env = self.parser_dir / ".env"
        if parser_env.exists():
            with open(parser_env, 'r') as f:
                content = f.read()
                
            print(f"📁 Найден telegram_parser .env файл ({len(content)} символов)")
            
            lines = content.strip().split('\n')
            for line in lines:
                if '=' in line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip()
                    
                    if key == 'TG_API_ID':
                        self.extracted_keys['API_ID'] = value
                        print(f"✅ Telegram API_ID найден: {value}")
                    
                    elif key == 'TG_API_HASH':
                        self.extracted_keys['API_HASH'] = value
                        print(f"✅ Telegram API_HASH найден: {value[:20]}...")
                    
                    elif key.startswith('OPENROUTER_API_KEY') and 'OPENAI_API_KEY' not in self.extracted_keys:
                        self.extracted_keys['OPENAI_API_KEY'] = value
                        print(f"✅ OpenAI API ключ из parser: {value[:20]}...")
        
        # Извлекаем сессию
        session_file = self.parser_dir / ".session.json"
        if session_file.exists():
            with open(session_file, 'r') as f:
                self.session_data = json.load(f)
            print("🔑 Рабочая Telegram сессия найдена и загружена!")
            print(f"📊 Сессия содержит {len(self.session_data)} ключей авторизации")
        else:
            print("❌ Файл сессии не найден")
    
    def get_owner_id(self):
        """Пытается определить Owner ID из различных источников"""
        # Ищем в разных местах возможные ID
        possible_ids = []
        
        # Проверяем файлы конфигурации
        for project_dir in [self.ikar_dir, self.parser_dir]:
            for config_file in project_dir.rglob("*.json"):
                try:
                    if config_file.stat().st_size < 1024 * 1024:  # Не больше 1MB
                        with open(config_file, 'r') as f:
                            data = json.load(f)
                            if isinstance(data, dict):
                                for key, value in data.items():
                                    if 'user' in key.lower() or 'owner' in key.lower() or 'admin' in key.lower():
                                        if isinstance(value, (int, str)) and str(value).isdigit():
                                            possible_ids.append(str(value))
                except:
                    continue
        
        # Берем первый найденный ID или дефолтный
        if possible_ids:
            owner_id = possible_ids[0]
            print(f"🎯 Owner ID найден: {owner_id}")
        else:
            owner_id = "YOUR_TELEGRAM_ID"
            print("⚠️ Owner ID не найден, нужно указать вручную")
        
        return owner_id
    
    def create_contentbot_env(self):
        """Создает .env файл для ContentBot"""
        print("📝 Создаю .env файл для ContentBot...")
        
        owner_id = self.get_owner_id()
        
        env_content = f"""# Telegram API (из telegram_parser)
API_ID={self.extracted_keys.get('API_ID', 'your_api_id')}
API_HASH={self.extracted_keys.get('API_HASH', 'your_api_hash')}
BOT_TOKEN={self.extracted_keys.get('TELEGRAM_BOT_TOKEN', 'your_bot_token')}
ADMIN_BOT_TOKEN=your_admin_bot_token

# OpenAI/LLM (из IKAR/telegram_parser)
OPENAI_API_KEY={self.extracted_keys.get('OPENAI_API_KEY', 'your_openai_key')}
LLM_API={self.extracted_keys.get('LLM_API', 'your_llm_api')}

# Admin (нужно указать вручную)
ADMIN_CHAT_ID={owner_id}
OWNER_ID={owner_id}

# Payment Systems (опционально)
YOOMONEY_TOKEN=your_yoomoney_token
CRYPTO_WALLET=your_crypto_wallet

# Database
DATABASE_URL=./data/contentbot.db

# Pricing
MONTHLY_PRICE=3000
CHANNEL_SETUP_PRICE=10000
PREMIUM_PRICE=15000

# Content Settings
MAX_CHANNELS_PER_USER=5
POSTS_PER_DAY=10
MAX_POST_LENGTH=4000

# Session file (автоматически скопирован)
SESSION_FILE=.session.json
"""
        
        env_file = self.contentbot_dir / ".env"
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        print(f"✅ .env файл создан: {env_file}")
        return env_file
    
    def copy_session(self):
        """Копирует сессию в ContentBot"""
        if self.session_data:
            session_file = self.contentbot_dir / ".session.json"
            with open(session_file, 'w') as f:
                json.dump(self.session_data, f, indent=2)
            print(f"✅ Сессия скопирована: {session_file}")
            return session_file
        return None
    
    def create_session_helper(self):
        """Создает helper для работы с сессией"""
        helper_content = '''"""
🔑 Helper для работы с Telegram сессией из telegram_parser
"""
import json
from pathlib import Path

class SessionHelper:
    def __init__(self, session_file=".session.json"):
        self.session_file = Path(session_file)
        self.session_data = None
        self.load_session()
    
    def load_session(self):
        """Загружает сессию из файла"""
        if self.session_file.exists():
            with open(self.session_file, 'r') as f:
                self.session_data = json.load(f)
            print(f"✅ Сессия загружена из {self.session_file}")
            return True
        else:
            print(f"❌ Файл сессии не найден: {self.session_file}")
            return False
    
    def get_session_string(self):
        """Возвращает session string для MTProto"""
        if not self.session_data:
            return None
        
        # Конвертируем из формата telegram_parser в строку
        return json.dumps(self.session_data)
    
    def is_valid(self):
        """Проверяет валидность сессии"""
        if not self.session_data:
            return False
        
        required_keys = ['timeOffset', '2authKey', '2serverSalt']
        return all(key in self.session_data for key in required_keys)
    
    def get_stats(self):
        """Возвращает статистику сессии"""
        if not self.session_data:
            return "Сессия не загружена"
        
        auth_keys = [k for k in self.session_data.keys() if 'authKey' in k]
        return f"Сессия содержит {len(auth_keys)} auth ключей, offset: {self.session_data.get('timeOffset', 'N/A')}"

# Пример использования:
if __name__ == "__main__":
    helper = SessionHelper()
    if helper.is_valid():
        print("🔑 Сессия валидна!")
        print(f"📊 {helper.get_stats()}")
    else:
        print("❌ Сессия невалидна")
'''
        
        helper_file = self.contentbot_dir / "session_helper.py"
        with open(helper_file, 'w') as f:
            f.write(helper_content)
        
        print(f"✅ Session helper создан: {helper_file}")
        return helper_file
    
    def show_summary(self):
        """Показывает сводку извлеченных данных"""
        print("\n" + "="*60)
        print("📊 СВОДКА ИЗВЛЕЧЕННЫХ ДАННЫХ")
        print("="*60)
        
        print("🔑 Найденные API ключи:")
        for key, value in self.extracted_keys.items():
            if isinstance(value, list):
                print(f"  ✅ {key}: {len(value)} ключей")
            else:
                masked_value = value[:20] + "..." if len(value) > 20 else value
                print(f"  ✅ {key}: {masked_value}")
        
        if self.session_data:
            auth_keys = [k for k in self.session_data.keys() if 'authKey' in k]
            print(f"\n🔐 Telegram сессия: {len(auth_keys)} auth ключей")
            print("  ✅ Готова к использованию без повторной авторизации!")
        
        print(f"\n📁 Файлы созданы в: {self.contentbot_dir}")
        print("📝 .env - основные настройки")
        print("🔑 .session.json - авторизация Telegram")
        print("🐍 session_helper.py - helper для работы с сессией")
        
        print("\n🚀 СЛЕДУЮЩИЕ ШАГИ:")
        print("1. Создай админ-бота через @BotFather")
        print("2. Укажи ADMIN_BOT_TOKEN в .env")
        print("3. Узнай свой Telegram ID через @userinfobot")
        print("4. Укажи OWNER_ID в .env")
        print("5. Запускай: ./start.sh pm2")
        
        print("\n💡 ПРЕИМУЩЕСТВА:")
        print("✅ Авторизация Telegram БЕЗ запроса телефона!")
        print("✅ Рабочие API ключи из твоих проектов")  
        print("✅ Готовая конфигурация для запуска")
        print("="*60)
    
    def run(self):
        """Основной метод извлечения"""
        print("🚀 ContentBot Key Extractor")
        print("="*40)
        
        # Извлекаем данные
        self.extract_from_ikar()
        print()
        self.extract_from_telegram_parser()
        print()
        
        # Создаем файлы
        self.create_contentbot_env()
        self.copy_session()
        self.create_session_helper()
        
        # Показываем сводку
        self.show_summary()

if __name__ == "__main__":
    extractor = KeyExtractor()
    extractor.run() 