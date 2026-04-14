from flask import Flask
from config import Config
from routes import all_blueprints

class NeoApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.app.config.from_object(Config)
        self.register_blueprints()

    def register_blueprints(self):
        for bp in all_blueprints:
            self.app.register_blueprint(bp)

    def run(self):
        self.app.run(debug=True)

if __name__ == "__main__":
    neo = NeoApp()
    neo.run()