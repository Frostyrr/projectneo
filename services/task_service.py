from datetime import datetime

class TaskService:
    def __init__(self, db):
        self.db = db

    def save_task(self, username, text, time, date):
        try:
            self.db.tasks.insert_one({
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
        tasks = list(self.db.tasks.find({"username": username}, {"_id": 0}))
        return tasks
    
    def delete_task(self, username, text, time, date):
        self.db.tasks.delete_one({
            "username": username,
            "text": text,
            "time": time,
            "date": date
        })
        
    def delete_multiple_tasks(self, username, tasks):
        for task in tasks:
            self.db.tasks.delete_one({
                "username": username,
                "text": task["text"],
                "time": task["time"],
                "date": task["date"]
            })