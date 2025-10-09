"""
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
