from .auth_routes import auth_bp
from .chat_routes import chat_bp
from .task_routes import task_bp
from .user_routes import user_bp
from .main_routes import main_bp
from .reminder_routes import reminder_bp

all_blueprints = [
    auth_bp,
    chat_bp,
    task_bp,
    user_bp,
    main_bp,
    reminder_bp
]