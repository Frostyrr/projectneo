from flask import Blueprint, render_template, request, session, redirect, url_for
from extensions import db, auth_service, otp_service

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email").strip().lower()
        password = request.form.get("password")

        exists, error_msg = auth_service.check_user_exists(username, email)
        if exists:
            return render_template("register.html", error=error_msg)

        otp_service.generate_and_send_otp(email, "register")
        
        session["register_data"] = {"username": username, "email": email, "password": password}
        return render_template("verify-otp.html", email=email, purpose="register", back_url=url_for("auth.register"))

    return render_template("register.html")

@auth_bp.route("/verify-register-otp/<email>", methods=["GET", "POST"])
def verify_register_otp(email):
    if request.method == "POST":
        otp = request.form.get("otp").strip()
        if otp_service.verify_otp(email, otp):
            data = session.pop("register_data", None)
            if not data:
                return redirect(url_for("auth.register"))
            
            auth_service.create_user(data["username"], data["email"], data["password"])
            return redirect(url_for("auth.login"))
            
        return render_template("verify-otp.html", email=email, error="Invalid or expired OTP", purpose="register")
    return render_template("verify-otp.html", email=email, purpose="register")

@auth_bp.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if auth_service.verify_credentials(username, password):
            session["user"] = username
            return redirect(url_for("main.chat"))
        return render_template("login.html", error="Invalid credentials")

    return render_template("login.html")

@auth_bp.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email").strip().lower()
        user = db.users.find_one({"email": email}) # Simple check ok here

        if user:
            otp_service.generate_and_send_otp(email, "reset")
            return redirect(url_for("auth.verify_otp", email=email))

        return render_template("verify-otp.html", email=email, purpose="reset", back_url=url_for("auth.forgot_password"))
    return render_template("forgot-password.html")

@auth_bp.route("/verify-otp/<email>", methods=["GET", "POST"])
def verify_otp(email):
    purpose = request.args.get("purpose", "reset")
    back_url = url_for("auth.forgot_password") if purpose == "reset" else url_for("auth.register")

    if request.method == "POST":
        otp = request.form.get("otp").strip()
        if otp_service.verify_otp(email, otp):
            session["otp_verified_for_reset"] = email
            return redirect(url_for("auth.reset_password", email=email))
        return render_template("verify-otp.html", email=email, error="Invalid or expired OTP", purpose=purpose, back_url=back_url)
        
    return render_template("verify-otp.html", email=email, purpose=purpose, back_url=back_url)

@auth_bp.route("/reset-password/<email>", methods=["GET", "POST"])
def reset_password(email):
    if session.get("otp_verified_for_reset") != email:
        return redirect(url_for("auth.forgot_password"))

    if request.method == "POST":
        new_password = request.form.get("password").strip()
        confirm_password = request.form.get("confirmPassword").strip()

        if new_password != confirm_password:
            return render_template("reset-password.html", email=email, error="Passwords do not match")

        auth_service.reset_password(email, new_password)
        session.pop("otp_verified_for_reset", None)
        return redirect(url_for("auth.login"))

    return render_template("reset-password.html", email=email)

@auth_bp.route("/resend-otp/<email>/<purpose>")
def resend_otp(email, purpose):
    otp_service.generate_and_send_otp(email, purpose)
    if purpose == "register":
        return redirect(url_for("auth.verify_register_otp", email=email))
    return redirect(url_for("auth.verify_otp", email=email))

@auth_bp.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("auth.login"))