from datetime import datetime

class ChatService:
    def __init__(self, db):
        self.db = db  # Injected Database instance

    def save_chat(self, chat_id, username, messages, title=None):
        update_fields = {
            "username": username,
            "messages": messages,
            "updated_at": datetime.utcnow()
        }
        if title:
            update_fields["title"] = title

        self.db.chat_history.update_one(
            {"chat_id": chat_id},
            {"$set": update_fields, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True
        )

    def load_chat(self, chat_id):
        # Return ALL messages so the frontend can display the full history
        history = self.db.chat_history.find_one({"chat_id": chat_id})
        if history:
            return history.get("messages", [])
        return []

    def get_user_chats(self, username):
        # Sort by pinned first (True/1), then by updated_at (Newest first)
        chats = self.db.chat_history.find({
            "username": username,
            "chat_id": {"$exists": True, "$ne": None}
        }).sort([("is_pinned", -1), ("updated_at", -1)])
        
        return [{
            "chat_id": c.get("chat_id"), 
            "title": c.get("title", "New Chat"),
            "is_pinned": c.get("is_pinned", False)
        } for c in chats]

    def toggle_pin_chat(self, chat_id, is_pinned):
        self.db.chat_history.update_one(
            {"chat_id": chat_id}, 
            {"$set": {"is_pinned": is_pinned}}
        )

    def rename_chat(self, chat_id, new_title):
        self.db.chat_history.update_one(
            {"chat_id": chat_id}, 
            {"$set": {"title": new_title}}
        )

    def delete_chat(self, chat_id):
        self.db.chat_history.delete_one({"chat_id": chat_id})