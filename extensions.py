from config import Config
from database import Database
from ai_bot import NeoAssistant
from email_service import EmailService
from scheduler_service import SchedulerService

db = Database(Config.MONGO_URI)

bot = NeoAssistant(Config.GROQ_API_KEY, Config.GROQ_API_URL)

email_service = EmailService(
    script_url="https://script.google.com/macros/s/AKfycbyFrZiYUWyc6XEkFEkjCrq27q139K4orMEibpMvxdLe6iBXYsxI72Giob-dHW8nZZVw/exec",
    secret_token="NeoPassword123!"
)

scheduler_service = SchedulerService(db)