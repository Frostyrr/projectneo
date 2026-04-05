from flask import Blueprint, render_template, request, session, redirect, url_for
from extensions import db

user_bp = Blueprint('user', __name__)

@user_bp.route("/settings", methods=["GET", "POST"])
def settings():
    if "user" not in session:
        return redirect(url_for("auth.login"))
    
    username = session["user"]
    user_data = db.get_user(username)
    current_email = user_data.get("email", "") if user_data else ""
    
    message = None
    if request.method == "POST":
        new_email = request.form.get("email")
        new_password = request.form.get("password")
        
        if new_password:
            db.update_user(username, new_email=new_email, new_password=new_password)
            message = "Profile and password updated successfully!"
        else:
            db.update_user(username, new_email=new_email)
            message = "Profile updated successfully!"
        
        current_email = new_email
        
    return render_template("settings.html", username=username, email=current_email, message=message)

@user_bp.route("/delete-account", methods=["POST"])
def delete_account():
    if "user" not in session:
        return redirect(url_for("auth.login"))
    
    username = session["user"]
    db.delete_user(username)
    session.pop("user", None) 
    return redirect(url_for("auth.login"))