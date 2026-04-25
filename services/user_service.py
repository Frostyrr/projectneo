from werkzeug.security import generate_password_hash, check_password_hash

class UserService:
    def __init__(self, db):
        self.db = db

    def get_user_data(self, username):
        return self.db.users.find_one({"username": username})

    def update_password(self, username, current_password, new_password, confirm_password):
        user = self.get_user_data(username)
        if not current_password:
            return False, "Current password is required."
        if not check_password_hash(user["password"], current_password):
            return False, "Incorrect current password."
        if new_password != confirm_password:
            return False, "New passwords do not match."
        
        self.db.users.update_one(
            {"username": username}, 
            {"$set": {"password": generate_password_hash(new_password)}}
        )
        return True, "Password updated successfully."

    def update_email(self, username, new_email):
        self.db.users.update_one({"username": username}, {"$set": {"email": new_email}})

    def delete_account(self, username):
        self.db.users.delete_one({"username": username})
        self.db.chat_history.delete_many({"username": username})
        self.db.reminders.delete_many({"username": username})
        self.db.tasks.delete_many({"username": username})