from flask import Blueprint, render_template, request, session, redirect, url_for
from werkzeug.security import generate_password_hash
import random
from extensions import db, email_service

auth_bp = Blueprint('auth', __name__)

# ==================
# REGISTRATION ROUTE
# ==================
@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email").strip().lower()
        password = request.form.get("password")

        if db.users.find_one({"username": username}):
            return render_template("register.html", error="Username already exists")

        if db.users.find_one({"email": email}):
            return render_template("register.html", error="Email already registered")

        otp = str(random.randint(100000, 999999))
        db.save_otp(email, otp)
        
        session["register_data"] = {
            "username": username,
            "email": email,
            "password": password
        }

        email_service.send_otp(email, otp, "register")
        return render_template("verify-otp.html", email=email, purpose="register", back_url=url_for("auth.register"))

    return render_template("register.html")

# =============================
# REGISTRATION OTP VERIFICATION
# =============================
@auth_bp.route("/verify-register-otp/<email>", methods=["GET", "POST"])
def verify_register_otp(email):
    if request.method == "POST":
        otp = request.form.get("otp").strip()
        if db.verify_otp(email, otp):
            data = session.get("register_data")
            if not data:
                return redirect(url_for("auth.register"))
            db.create_user(data["username"], data["email"], data["password"])
            session.pop("register_data", None)
            return redirect(url_for("auth.login"))
        return render_template("verify-otp.html", email=email, error="Invalid or expired OTP", purpose="register")
    return render_template("verify-otp.html", email=email, purpose="register")

# ===========
# LOGIN ROUTE
# ===========
@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if db.verify_user(username, password):
            session["user"] = username
            return redirect(url_for("main.chat"))
        return render_template("login.html", error="Invalid credentials")

    return render_template("login.html")

# ===============
# FORGOT PASSWORD
# ===============
@auth_bp.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email").strip().lower()
        user = db.users.find_one({"email": email})

        if user:
            otp = str(random.randint(100000, 999999))
            db.save_otp(email, otp)
            email_service.send_otp(email, otp)
            return redirect(url_for("auth.verify_otp", email=email))

        return render_template("verify-otp.html", email=email, purpose="reset", back_url=url_for("auth.forgot_password"))
    return render_template("forgot-password.html")

# ======================
# EMAIL OTP VERIFICATION
# ======================
@auth_bp.route("/verify-otp/<email>", methods=["GET", "POST"])
def verify_otp(email):
    purpose = request.args.get("purpose", "reset")
    back_url = url_for("auth.forgot_password") if purpose == "reset" else url_for("auth.register")

    if request.method == "POST":
        otp = request.form.get("otp").strip()
        if db.verify_otp(email, otp):
            if purpose == "register":
                data = session.get("register_data")
                if not data:
                    return redirect(url_for("auth.register"))
                db.create_user(data["username"], data["email"], data["password"])
                session.pop("register_data", None)
                return redirect(url_for("auth.login"))
            else: 
                session["otp_verified_for_reset"] = email
                return redirect(url_for("auth.reset_password", email=email))
        else:
            return render_template("verify-otp.html", email=email, error="Invalid or expired OTP", purpose=purpose, back_url=back_url)
        
    return render_template("verify-otp.html", email=email, purpose=purpose, back_url=back_url)

# ==============
# RESET PASSWORD
# ==============
@auth_bp.route("/reset-password/<email>", methods=["GET", "POST"])
def reset_password(email):
    if session.get("otp_verified_for_reset") != email:
        return redirect(url_for("auth.forgot_password"))

    if request.method == "POST":
        new_password = request.form.get("password").strip()
        confirm_password = request.form.get("confirmPassword").strip()

        if new_password != confirm_password:
            return render_template("reset-password.html", email=email, error="Passwords do not match")

        db.users.update_one(
            {"email": email},
            {"$set": {"password": generate_password_hash(new_password)}}
        )
        session.pop("otp_verified_for_reset", None)
        return redirect(url_for("auth.login"))

    return render_template("reset-password.html", email=email)

# ================
# RESEND OTP ROUTE
# ================
@auth_bp.route("/resend-otp/<email>/<purpose>")
def resend_otp(email, purpose):
    otp = str(random.randint(100000, 999999))
    db.save_otp(email, otp)
    email_service.send_otp(email, otp, purpose)

    if purpose == "register":
        return redirect(url_for("auth.verify_register_otp", email=email))
    else:
        return redirect(url_for("auth.verify_otp", email=email))

# =============
# LOGOUT ROUTE
# ============
@auth_bp.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("auth.login"))