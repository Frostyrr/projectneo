from database import Database
from email_service import EmailService
from ai_bot import NeoAssistant
from config import Config
from services import (
    AuthService, UserService, OTPService, 
    ChatService, TaskService, ReminderService
)

# Base Connections
db = Database(Config.MONGO_URI)
bot = NeoAssistant(Config.GROQ_API_KEY, Config.GROQ_API_URL)
email_service = EmailService(Config.EMAIL_SCRIPT_URL, Config.EMAIL_SECRET_TOKEN)

# Services
auth_service = AuthService(db)
user_service = UserService(db)
otp_service = OTPService(db, email_service)
chat_service = ChatService(db)
task_service = TaskService(db)
reminder_service = ReminderService(db)