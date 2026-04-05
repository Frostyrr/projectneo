from flask import Flask
from config import Config

from routes.auth_routes import auth_bp
from routes.chat_routes import chat_bp
from routes.task_routes import task_bp
from routes.user_routes import user_bp
from routes.main_routes import main_bp
from routes.reminder_routes import reminder_bp  

app = Flask(__name__)
app.config.from_object(Config)

app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(task_bp)
app.register_blueprint(user_bp)
app.register_blueprint(main_bp)
app.register_blueprint(reminder_bp) 

if __name__ == "__main__":
    app.run(debug=True)