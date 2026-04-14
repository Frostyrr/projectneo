from config import Config
from database import Database
from ai_bot import NeoAssistant
from email_service import EmailService
from scheduler_service import SchedulerService

db = Database(Config.MONGO_URI)

bot = NeoAssistant(Config.GROQ_API_KEY, Config.GROQ_API_URL)

email_service = EmailService(
    script_url=Config.EMAIL_SCRIPT_URL,
    secret_token=Config.EMAIL_SECRET_TOKEN
)

scheduler_service = SchedulerService(db)