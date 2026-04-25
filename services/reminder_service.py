from datetime import datetime
from bson.objectid import ObjectId

class ReminderService:
    def __init__(self, db):
        self.db = db

    def save_reminder(self, username, source_type, source_id, reminder_time, reminder_note):
        """Save a reminder linked to a task or class"""
        self.db.reminders.insert_one({
            "username": username,
            "source_type": source_type,  # 'task' or 'class'
            "source_id": source_id,      # unique identifier
            "reminder_time": reminder_time,
            "reminder_note": reminder_note,
            "is_completed": False,
            "is_dismissed": False,
            "created_at": datetime.utcnow()
        })

    def get_reminders(self, username):
        """Get all active reminders for a user"""
        reminders = list(self.db.reminders.find({
            "username": username,
            "is_dismissed": False
        }).sort("reminder_time", 1))

        # Convert ObjectId to string for JSON serialization
        for reminder in reminders:
            reminder["_id"] = str(reminder["_id"])

        return reminders

    def update_reminder(self, reminder_id, **kwargs):
        """Update reminder fields (snooze, complete, dismiss)"""
        self.db.reminders.update_one(
            {"_id": ObjectId(reminder_id)},
            {"$set": kwargs}
        )

    def delete_reminder(self, reminder_id):
        """Delete a specific reminder"""
        self.db.reminders.delete_one({"_id": ObjectId(reminder_id)})

    def get_task_reminders(self, username, task_text, task_date, task_time):
        """Get reminders for a specific task"""
        return list(self.db.reminders.find({
            "username": username,
            "source_type": "task",
            "source_id": f"{task_text}_{task_date}_{task_time}"
        }))

    def get_class_reminders(self, username, class_name, day, start_time):
        """Get reminders for a specific class"""
        return list(self.db.reminders.find({
            "username": username,
            "source_type": "class",
            "source_id": f"{class_name}_{day}_{start_time}"
        }))