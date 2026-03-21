# database.py
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import certifi

class Database:
    def __init__(self, uri):
        self.client = MongoClient(uri, tlsCAFile=certifi.where())
        self.db = self.client.ai_assistant_db
        self.users = self.db.users
        self.chat_history = self.db.chat_history
        self.reminders = self.db.reminders

    def create_user(self, username, password):
        if self.users.find_one({"username": username}):
            return False # User exists
        self.users.insert_one({
            "username": username,
            "password": generate_password_hash(password)
        })
        return True

    def verify_user(self, username, password):
        user = self.users.find_one({"username": username})
        if user and check_password_hash(user["password"], password):
            return True
        return False

    def save_chat(self, username, messages):
        self.chat_history.update_one(
            {"username": username},
            {"$set": {"messages": messages}},
            upsert=True
        )

    def load_chat(self, username):
        history = self.chat_history.find_one({"username": username})
        if history:
            return history.get("messages", [])[-10:]
        return []

    def save_reminder(self, username, task, time_str):
        self.reminders.insert_one({
            "username": username,
            "task": task,
            "time": time_str
        })