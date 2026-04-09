from flask import Blueprint, request, session, jsonify, redirect, url_for
from werkzeug.security import check_password_hash
from extensions import db, email_service
import random

user_bp = Blueprint('user', __name__)

@user_bp.route("/api/user/settings", methods=["POST"])
def update_settings():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    username = session["user"]
    user_data = db.get_user(username)
    
    data = request.json
    new_email = data.get("email").strip().lower() if data.get("email") else None
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")
    
    update_fields = {}
    response_messages = []
    require_otp = False
    
    # 1. Password Verification & Update (Happens Immediately)
    if new_password:
        if not current_password:
            return jsonify({"error": "Current password is required to set a new password."}), 400
        if not check_password_hash(user_data["password"], current_password):
            return jsonify({"error": "Incorrect current password."}), 400
        if new_password != confirm_password:
            return jsonify({"error": "New passwords do not match."}), 400
        
        update_fields["new_password"] = new_password
        response_messages.append("Password updated successfully.")

    if update_fields:
        db.update_user(username, **update_fields)

    # 2. Email Verification & OTP Trigger
    if new_email and new_email != user_data.get("email"):
        if db.users.find_one({"email": new_email}):
            return jsonify({"error": "This email is already in use by another account."}), 400
        
        # Generate OTP, send it, and hold email in session
        otp = str(random.randint(100000, 999999))
        db.save_otp(new_email, otp)
        email_service.send_otp(new_email, otp, purpose="update_email")
        
        session["pending_email"] = new_email
        require_otp = True
        response_messages.append(f"An OTP has been sent to {new_email}.")

    if require_otp:
        return jsonify({"require_otp": True, "message": " ".join(response_messages), "pending_email": new_email})
    elif update_fields:
        return jsonify({"success": True, "message": " ".join(response_messages)})
    else:
        return jsonify({"success": True, "message": "No changes were made."})

@user_bp.route("/api/user/verify-email-change", methods=["POST"])
def verify_email_change():
    if "user" not in session or "pending_email" not in session:
        return jsonify({"error": "No pending email change."}), 400

    username = session["user"]
    pending_email = session["pending_email"]
    otp = request.json.get("otp").strip()

    if db.verify_otp(pending_email, otp):
        db.update_user(username, new_email=pending_email)
        session.pop("pending_email", None) # Clear session
        return jsonify({"success": True, "message": "Email updated successfully!"})
    else:
        return jsonify({"error": "Invalid or expired OTP."}), 400

@user_bp.route("/delete-account", methods=["POST"])
def delete_account():
    if "user" not in session:
        return redirect(url_for("auth.login"))
    
    username = session["user"]
    db.delete_user(username)
    session.pop("user", None) 
    return redirect(url_for("auth.login"))