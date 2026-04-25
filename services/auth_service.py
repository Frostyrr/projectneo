from werkzeug.security import generate_password_hash, check_password_hash

class AuthService:
    def __init__(self, db):
        self.db = db

    def check_user_exists(self, username, email):
        if self.db.users.find_one({"username": username}):
            return True, "Username already exists"
        if self.db.users.find_one({"email": email}):
            return True, "Email already registered"
        return False, ""

    def create_user(self, username, email, password):
        self.db.users.insert_one({
            "username": username,
            "email": email,
            "password": generate_password_hash(password)
        })

    def verify_credentials(self, username, password):
        user = self.db.users.find_one({"username": username})
        if user and check_password_hash(user["password"], password):
            return True
        return False

    def reset_password(self, email, new_password):
        self.db.users.update_one(
            {"email": email},
            {"$set": {"password": generate_password_hash(new_password)}}
        )