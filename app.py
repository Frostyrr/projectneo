from flask import Flask
from config import Config
from routes.auth_routes import auth_bp
from routes.chat_routes import chat_bp
from routes.task_routes import task_bp
from routes.user_routes import user_bp
from routes.main_routes import main_bp
from routes.reminder_routes import reminder_bp  

class NeoApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config.from_object(Config)
        self.register_blueprints()

    def register_blueprints(self):
        self.app.register_blueprint(auth_bp)
        self.app.register_blueprint(chat_bp)
        self.app.register_blueprint(task_bp)
        self.app.register_blueprint(user_bp)
        self.app.register_blueprint(main_bp)
        self.app.register_blueprint(reminder_bp)

    def run(self):
        self.app.run(debug=True)

if __name__ == "__main__":
    neo = NeoApp()
    neo.run()