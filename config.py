import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))

load_dotenv(os.path.join(basedir, '.env'), override=True)

class Config:
    # flask
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "fallback_secret")
    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    
    # mongodb
    MONGO_URI = os.getenv("MONGO_URI")

    # google scripts for OTP Verification
    EMAIL_SCRIPT_URL = os.getenv("EMAIL_SCRIPT_URL")
    EMAIL_SECRET_TOKEN = os.getenv("EMAIL_SECRET_TOKEN")