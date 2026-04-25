from flask import Blueprint, request, session, jsonify, redirect, url_for
from extensions import db, user_service, otp_service

user_bp = Blueprint('user', __name__)

@user_bp.route("/api/user/settings", methods=["POST"])
def update_settings():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    username = session["user"]
    user_data = user_service.get_user_data(username)
    data = request.json
    
    response_messages = []
    
    # 1. Password Update
    if data.get("new_password"):
        success, msg = user_service.update_password(
            username, 
            data.get("current_password"), 
            data.get("new_password"), 
            data.get("confirm_password")
        )
        if not success:
            return jsonify({"error": msg}), 400
        response_messages.append(msg)

    # 2. Email Change Verification Request
    new_email = data.get("email").strip().lower() if data.get("email") else None
    if new_email and new_email != user_data.get("email"):
        if db.users.find_one({"email": new_email}):
            return jsonify({"error": "This email is already in use."}), 400
        
        otp_service.generate_and_send_otp(new_email, "update_email")
        session["pending_email"] = new_email
        response_messages.append(f"An OTP has been sent to {new_email}.")
        return jsonify({"require_otp": True, "message": " ".join(response_messages), "pending_email": new_email})

    if response_messages:
        return jsonify({"success": True, "message": " ".join(response_messages)})
    
    return jsonify({"success": True, "message": "No changes were made."})

@user_bp.route("/api/user/request-email-edit", methods=["POST"])
def request_email_edit():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    current_email = user_service.get_user_data(session["user"]).get("email")
    if not current_email:
        return jsonify({"error": "No current email found."}), 400
    
    otp_service.generate_and_send_otp(current_email, "verify_old_email")
    return jsonify({"success": True, "message": "Verification code sent."})

@user_bp.route("/api/user/verify-old-email", methods=["POST"])
def verify_old_email():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    current_email = user_service.get_user_data(session["user"]).get("email")
    if otp_service.verify_otp(current_email, request.json.get("otp").strip()):
        session["can_edit_email"] = True 
        return jsonify({"success": True})
    
    return jsonify({"error": "Invalid or expired verification code."}), 400

@user_bp.route("/api/user/verify-email-change", methods=["POST"])
def verify_email_change():
    if "user" not in session or "pending_email" not in session:
        return jsonify({"error": "No pending email change."}), 400

    pending_email = session["pending_email"]
    if otp_service.verify_otp(pending_email, request.json.get("otp").strip()):
        user_service.update_email(session["user"], pending_email)
        session.pop("pending_email", None)
        return jsonify({"success": True, "message": "Email updated successfully!"})
    
    return jsonify({"error": "Invalid or expired OTP."}), 400

@user_bp.route("/delete-account", methods=["POST"])
def delete_account():
    if "user" not in session:
        return redirect(url_for("auth.login"))
    
    user_service.delete_account(session["user"])
    session.pop("user", None) 
    return redirect(url_for("auth.login"))