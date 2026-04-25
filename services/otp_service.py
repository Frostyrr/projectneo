import random
from datetime import datetime, timedelta

class OTPService:
    def __init__(self, db, email_service):
        self.db = db
        self.email_service = email_service

    def generate_and_send_otp(self, email, purpose, expire_minutes=10):
        otp = str(random.randint(100000, 999999))
        expire_at = datetime.utcnow() + timedelta(minutes=expire_minutes)
        
        self.db.otps.update_one(
            {"email": email},
            {"$set": {"otp": otp, "expire_at": expire_at}},
            upsert=True
        )
        
        # Centralized email trigger
        self.email_service.send_otp(email, otp, purpose)
        return True

    def verify_otp(self, email, otp):
        record = self.db.otps.find_one({"email": email, "otp": otp})
        if record and record["expire_at"] > datetime.utcnow():
            self.db.otps.delete_one({"email": email})  # Burn OTP after use
            return True
        return False