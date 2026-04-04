from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import certifi
from datetime import datetime, timedelta
import uuid

class Database:
    def __init__(self, uri):
        self.client = MongoClient(uri, tlsCAFile=certifi.where())
        self.db = self.client.ai_assistant_db
        self.users = self.db.users
        self.chat_history = self.db.chat_history
        self.reminders = self.db.reminders
        self.otps = self.db.otps
        self.tasks = self.db.tasks 

    def create_user(self, username, email, password):
        if self.users.find_one({"username": username}):
            return False # User exists
        self.users.insert_one({
            "username": username,
            "email": email,
            "password": generate_password_hash(password)
        })
        return True

    def verify_user(self, username, password):
        user = self.users.find_one({"username": username})
        if user and check_password_hash(user["password"], password):
            return True
        return False
    
    def get_user(self, username):
        return self.users.find_one({"username": username})
    
    def update_user(self, username, new_email = None, new_password=None):
            update_fields = {}
            if new_email:
                update_fields["email"] = new_email

            if new_password:
                update_fields["password"] = generate_password_hash(new_password)
            
            if update_fields:
                # FIX: Moved the closing parenthesis to the end of the line
                self.users.update_one({"username": username}, {"$set": update_fields})
                return True
            return False
    
    def delete_user(self, username):
        # Delete the user's account
        self.users.delete_one({"username": username})
        # Delete associated chat history
        self.chat_history.delete_one({"username": username})
        # Delete associated reminders
        self.reminders.delete_many({"username": username})
        return True

    def save_chat(self, chat_id, username, messages):
        self.chat_history.update_one(
            {"chat_id": chat_id},
            {"$set": {
                "username": username,
                "messages": messages
            }},
            upsert=True
        )

    def load_chat(self, chat_id):
        history = self.chat_history.find_one({"chat_id": chat_id})
        if history:
            return history.get("messages", [])[-10:]
        return []

    def save_reminder(self, username, task, time_str):
        self.reminders.insert_one({
            "username": username,
            "task": task,
            "time": time_str
        })

    def save_otp(self, email, otp, expire_minutes=10):
        expire_at = datetime.utcnow() + timedelta(minutes=expire_minutes)
        self.otps.update_one(
            {"email": email},
            {"$set": {"otp": otp, "expire_at": expire_at}},
            upsert=True
        )

    def verify_otp(self, email, otp):
        record = self.otps.find_one({"email": email, "otp": otp})
        if record and record["expire_at"] > datetime.utcnow():
            self.otps.delete_one({"email": email})  # remove used OTP
            return True
        return False
    
    def save_task(self, username, text, time, date):
        try:
            self.tasks.insert_one({
                "username": username,
                "text": text,
                "time": time,
                "date": date,
                "created_at": datetime.utcnow()
            })
            print(f"Task saved: {text} at {date} {time}")
        except Exception as e:
            print("DB insert error:", e)
        
    def get_tasks(self, username):
        tasks = list(self.tasks.find({"username": username}, {"_id": 0}))
        return tasks
    
    def delete_task(self, username, text, time, date):
        self.tasks.delete_one({
            "username": username,
            "text": text,
            "time": time,
            "date": date
    })
        
    def delete_multiple_tasks(self, username, tasks):
        for task in tasks:
            self.tasks.delete_one({
                "username": username,
                "text": task["text"],
                "time": task["time"],
                "date": task["date"]
            })