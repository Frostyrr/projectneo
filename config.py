import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(__file__))

load_dotenv(os.path.join(basedir, '.env'), override=True)

class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "fallback_secret")
    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    
    MONGO_URI = os.getenv("MONGO_URI")