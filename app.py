from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

from config import Config
from database import Database
from ai_bot import NeoAssistant

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
        email = request.form.get("email")
        password = request.form.get("password")

        if db.create_user(username, email, password):
            session["user"] = username
            return redirect(url_for("chat"))
        return render_template("register.html", error="Account already exists")

    return render_template("register.html")

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
        email = request.form.get("email")
        
        # NOTE: For now, this just acts as a placeholder. 
        # To actually send emails, you would integrate something like Flask-Mail here.
        return render_template("forgot_password.html", message="If that email is in our system, a reset link has been sent.")
        
    return render_template("forgot_password.html")

@app.route("/profile", methods=["GET", "POST"])
def profile():
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
        
    return render_template("profile.html", username=username, email=current_email, message=message)

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