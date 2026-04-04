from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

class SchedulerService:
    def __init__(self, db):
        self.db = db
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()

    def _send_reminder(self, username, task):
        # In a real app, this might trigger an email or push notification
        print(f"[REMINDER] {username}: {task}")

    def schedule_reminder(self, username, task, time_str):
        try:
            run_time = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
            self.scheduler.add_job(self._send_reminder, 'date', run_date=run_time, args=[username, task])
            self.db.save_reminder(username, task, time_str)
            return True
        except Exception as e:
            print("Reminder error:", e)
            return False