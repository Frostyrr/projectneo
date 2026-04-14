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
        self.chat_history.delete_many({"username": username})
        # Delete associated reminders
        self.reminders.delete_many({"username": username})
        return True

    def save_chat(self, chat_id, username, messages, title=None):
        update_fields = {
            "username": username,
            "messages": messages,
            "updated_at": datetime.utcnow()
        }
        if title:
            update_fields["title"] = title

        self.chat_history.update_one(
            {"chat_id": chat_id},
            {"$set": update_fields, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True
        )

    def load_chat(self, chat_id):
        # Return ALL messages so the frontend can display the full history
        history = self.chat_history.find_one({"chat_id": chat_id})
        if history:
            return history.get("messages", [])
        return []

    def get_user_chats(self, username):
        # Sort by pinned first (True/1), then by updated_at (Newest first)
        chats = self.chat_history.find({
            "username": username,
            "chat_id": {"$exists": True, "$ne": None}
        }).sort([("is_pinned", -1), ("updated_at", -1)])
        
        return [{
            "chat_id": c.get("chat_id"), 
            "title": c.get("title", "New Chat"),
            "is_pinned": c.get("is_pinned", False) # NEW: return pinned status
        } for c in chats]

    def toggle_pin_chat(self, chat_id, is_pinned):
        self.chat_history.update_one(
            {"chat_id": chat_id}, 
            {"$set": {"is_pinned": is_pinned}}
        )

    def rename_chat(self, chat_id, new_title):
        self.chat_history.update_one(
            {"chat_id": chat_id}, 
            {"$set": {"title": new_title}}
        )

    def delete_chat(self, chat_id):
        self.chat_history.delete_one({"chat_id": chat_id})

    def save_reminder(self, username, source_type, source_id, reminder_time, reminder_note):
            """Save a reminder linked to a task or class"""
            self.reminders.insert_one({
                "username": username,
                "source_type": source_type,  
                "source_id": source_id,  
                "reminder_time": reminder_time,
                "reminder_note": reminder_note,
                "is_completed": False,
                "is_dismissed": False,
                "created_at": datetime.utcnow()
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

        # Add these methods to your Database class

    def save_reminder(self, username, source_type, source_id, reminder_time, reminder_note):
        """Save a reminder linked to a task or class"""
        self.reminders.insert_one({
            "username": username,
            "source_type": source_type,  # 'task' or 'class'
            "source_id": source_id,  # unique identifier
            "reminder_time": reminder_time,
            "reminder_note": reminder_note,
            "is_completed": False,
            "is_dismissed": False,
            "created_at": datetime.utcnow()
        })

    def get_reminders(self, username):
        """Get all active reminders for a user"""
        reminders = list(self.reminders.find({
            "username": username,
            "is_dismissed": False
        }).sort("reminder_time", 1))

        # Convert ObjectId to string for JSON serialization
        for reminder in reminders:
            reminder["_id"] = str(reminder["_id"])

        return reminders

    def update_reminder(self, reminder_id, **kwargs):
        """Update reminder fields (snooze, complete, dismiss)"""
        from bson.objectid import ObjectId
        self.reminders.update_one(
            {"_id": ObjectId(reminder_id)},
            {"$set": kwargs}
        )

    def delete_reminder(self, reminder_id):
        """Delete a specific reminder"""
        from bson.objectid import ObjectId
        self.reminders.delete_one({"_id": ObjectId(reminder_id)})

    def get_task_reminders(self, username, task_text, task_date, task_time):
        """Get reminders for a specific task"""
        return list(self.reminders.find({
            "username": username,
            "source_type": "task",
            "source_id": f"{task_text}_{task_date}_{task_time}"
        }))

    def get_class_reminders(self, username, class_name, day, start_time):
        """Get reminders for a specific class"""
        return list(self.reminders.find({
            "username": username,
            "source_type": "class",
            "source_id": f"{class_name}_{day}_{start_time}"
        }))