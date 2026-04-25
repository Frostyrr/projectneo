from pymongo import MongoClient
import certifi

class Database:
    def __init__(self, uri):
        self.client = MongoClient(uri, tlsCAFile=certifi.where())
        self.db = self.client.ai_assistant_db
        
        self.users = self.db.users
        self.chat_history = self.db.chat_history
        self.reminders = self.db.reminders
        self.otps = self.db.otps
        self.tasks = self.db.tasks