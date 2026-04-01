from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from werkzeug.security import generate_password_hash

from config import Config
from database import Database
from ai_bot import NeoAssistant

import random
import smtplib
from email.message import EmailMessage

app = Flask(__name__)
app.config.from_object(Config)

db = Database(app.config['MONGO_URI'])
bot = NeoAssistant(app.config['GROQ_API_KEY'], app.config['GROQ_API_URL'])

# -------------------- SCHEDULER --------------------
scheduler = BackgroundScheduler()
scheduler.start()

def send_reminder(username, task):
    print(f"[REMINDER] {username}: {task}")

def schedule_reminder(username, task, time_str):
    try:
        run_time = datetime.strptime(time_str, "%Y-%m-%d %H:%M:%S")
        scheduler.add_job(send_reminder, 'date', run_date=run_time, args=[username, task])
        db.save_reminder(username, task, time_str)
        return True
    except Exception as e:
        print("Reminder error:", e)
        return False

# -------------------- EMAIL OTP --------------------
def send_email(to_email, otp, purpose="reset"):
    from_mail = "project.neoassistant@gmail.com"
    app_password = "knlzzcfceekzlyrh"

    msg = EmailMessage()
    msg["From"] = from_mail
    msg["To"] = to_email

    if purpose == "register":
        msg["Subject"] = "Neo Account Verification OTP"
        msg.set_content(f"""Welcome to Neo!

Your OTP for account registration is:

{otp}

This code will expire in 10 minutes.

- Neo Team
""")
    else:
        msg["Subject"] = "Neo Password Reset OTP"
        msg.set_content(f"""We received a request to reset your password.

Your One-Time Password (OTP) is:

{otp}

This code will expire in 10 minutes.

If you did not request this, please ignore this email.

- Neo Team
""")

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(from_mail, app_password)
            smtp.send_message(msg)
            print(f"OTP sent to {to_email}: {otp}")
    except Exception as e:
        print("SMTP Error:", e)

# -------------------- ROUTES --------------------
@app.route("/")
def home():
    if "user" in session:
        return redirect(url_for("chat"))
    return redirect(url_for("login"))


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email").strip().lower()
        password = request.form.get("password")

        # Check if user already exists
        if db.users.find_one({"username": username}):
            return render_template("register.html", error="Username already exists")

        if db.users.find_one({"email": email}):
            return render_template("register.html", error="Email already registered")

        # Generate OTP
        otp = str(random.randint(100000, 999999))

        # Save OTP
        db.save_otp(email, otp)

        # TEMP: store user data in session (not DB yet)
        session["register_data"] = {
            "username": username,
            "email": email,
            "password": password
        }

        # Send OTP email
        send_email(email, otp, "register")

        return render_template("verify-otp.html", email=email, purpose="register", back_url=url_for("register")
    )

    return render_template("register.html")

@app.route("/verify-register-otp/<email>", methods=["GET", "POST"])
def verify_register_otp(email):
    if request.method == "POST":
        otp = request.form.get("otp").strip()
    
        if db.verify_otp(email, otp):
            data = session.get("register_data")
    
            if not data:
                return redirect(url_for("register"))
            db.create_user(data["username"], data["email"], data["password"])
            session.pop("register_data", None)
            return redirect(url_for("login"))
        
        return render_template("verify-otp.html", email=email, error="Invalid or expired OTP", purpose="register")

    return render_template("verify-otp.html", email=email, purpose="register")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")

        if db.verify_user(username, password):
            session["user"] = username
            return redirect(url_for("chat"))
        return render_template("login.html", error="Invalid credentials")

    return render_template("login.html")

@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form.get("email").strip().lower()
        user = db.users.find_one({"email": email})

        if user:
            otp = str(random.randint(100000, 999999))
            db.save_otp(email, otp)
            send_email(email, otp)
            return redirect(url_for("verify_otp", email=email))

        return render_template("verify-otp.html", email=email, purpose="reset", back_url=url_for("forgot_password"))
    
    return render_template("forgot-password.html")

@app.route("/verify-otp/<email>", methods=["GET", "POST"])
def verify_otp(email):
    purpose = request.args.get("purpose", "reset")

    back_url = url_for("forgot_password") if purpose == "reset" else url_for("register")

    if request.method == "POST":
        otp = request.form.get("otp").strip()
        if db.verify_otp(email, otp):
            if purpose == "register":
                data = session.get("register_data")
                if not data:
                    return redirect(url_for("register"))
                db.create_user(data["username"], data["email"], data["password"])
                session.pop("register_data", None)
                return redirect(url_for("login"))
            else: 
                session["otp_verified_for_reset"] = email
                return redirect(url_for("reset_password", email=email))
        else:
            return render_template(
                "verify-otp.html",
                email=email,
                error="Invalid or expired OTP",
                purpose=purpose,
                back_url=back_url
            )
        
    return render_template(
        "verify-otp.html",
        email=email,
        purpose=purpose,
        back_url=back_url
    )


@app.route("/reset-password/<email>", methods=["GET", "POST"])
def reset_password(email):
    if session.get("otp_verified_for_reset") != email:
        return redirect(url_for("forgot_password"))

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

        return redirect(url_for("login"))

    return render_template("reset-password.html", email=email)

@app.route("/resend-otp/<email>/<purpose>")
def resend_otp(email, purpose):
    otp = str(random.randint(100000, 999999))

    db.save_otp(email, otp)
    send_email(email, otp, purpose)

    if purpose == "register":
        return redirect(url_for("verify_register_otp", email=email))
    else:
        return redirect(url_for("verify_otp", email=email))

@app.route("/settings", methods=["GET", "POST"])
def settings():
    if "user" not in session:
        return redirect(url_for("login"))
    
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

@app.route("/delete-account", methods=["POST"])
def delete_account():
    if "user" not in session:
        return redirect(url_for("login"))
    
    username = session["user"]
    db.delete_user(username)
    session.pop("user", None) 
    return redirect(url_for("login"))

@app.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("login"))

@app.route("/chat")
def chat():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("index.html")

@app.route("/api/chat", methods=["POST"])
def api_chat():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_input = request.json.get("message")
    username = session["user"]

    if "remind me" in user_input.lower():
        parsed = bot.parse_reminder(user_input)
        if "error" in parsed:
            return jsonify({"reply": "I need a clearer date and time."})

        task = parsed.get("task")
        time_str = parsed.get("datetime")
        
        if schedule_reminder(username, task, time_str):
            return jsonify({"reply": f"Reminder scheduled for {time_str}."})
        return jsonify({"reply": "Failed to schedule reminder."})

    reply = bot.get_response(username, user_input, db)
    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(debug=True)

