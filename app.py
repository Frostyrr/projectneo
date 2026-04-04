from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
from werkzeug.security import generate_password_hash

from config import Config
from database import Database
from ai_bot import NeoAssistant

import random
import requests
import base64
import uuid # NEW: Imported for generating unique chat IDs

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
    
    # Paste your copied Google Script URL here
    GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyFrZiYUWyc6XEkFEkjCrq27q139K4orMEibpMvxdLe6iBXYsxI72Giob-dHW8nZZVw/exec"

    if purpose == "register":
        subject = "Neo Account Verification OTP"
        html_content = f"""
        <div style="font-family: sans-serif; color: #333;">
            <h2>Welcome to Neo!</h2>
            <p>Your OTP for account registration is: <strong style="font-size: 24px; color: #0d763a;">{otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>- Neo Team</p>
        </div>
        """
    else:
        subject = "Neo Password Reset OTP"
        html_content = f"""
        <div style="font-family: sans-serif; color: #333;">
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password.</p>
            <p>Your One-Time Password (OTP) is: <strong style="font-size: 24px; color: #0d763a;">{otp}</strong></p>
            <p>This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
            <p>- Neo Team</p>
        </div>
        """

    # Package the data to send to Google
    payload = {
        "secret_token": "NeoPassword123!", # NEW: Proves it's you
        "to": to_email,
        "subject": subject,
        "html": html_content
    }

    try:
        # Send a standard web request (HTTPS)
        response = requests.post(GOOGLE_SCRIPT_URL, json=payload)
        
        # NEW: Actually read the JSON data Google sends back
        result = response.json()
        
        if response.status_code == 200 and result.get("status") == "success":
            print(f"OTP sent to {to_email} via Google Apps Script: {otp}")
        else:
            # If Google failed, print the exact error message to the console
            print(f"Failed to send. Google responded with: {result}")
            
    except Exception as e:
        print("Google Apps Script Error:", e)

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
    chat_id = request.json.get("chat_id") # NEW: Extract chat_id sent from frontend
    username = session["user"]

    if "pending_task" in session:
        from ai_bot import parse_natural_time

        no_schedule_phrases = ["no", "not yet", "later", "skip", "no schedule", "none", "nope", "not now"]
        if any(phrase in user_input.lower() for phrase in no_schedule_phrases):
            task_text = session.pop("pending_task")  # clear pending
            db.save_task(username, task_text, "Not set", "Not set")  # ✅ save without time/date
            # NEW: Return the chat_id so frontend keeps track of the session
            return jsonify({
                "reply": f"✅ Got it! I've saved '{task_text}' without a schedule. You can set a time later. What else can I help you with?",
                "chat_id": chat_id 
            })

        fallback_time, fallback_date = parse_natural_time(user_input)

        if fallback_time != "Not set" and fallback_date != "Not set":
            task_text = session.pop("pending_task")
            db.save_task(username, task_text, fallback_time, fallback_date)
            return jsonify({
                "reply": f"✅ Task added: '{task_text}' at {fallback_time} on {fallback_date}",
                "chat_id": chat_id # NEW
            })
        else:
            task_text = session.pop("pending_task")
            # NEW: Provide and receive the chat_id from the bot
            reply, new_chat_id = bot.get_response(username, user_input, db, chat_id)
            return jsonify({"reply": reply, "chat_id": new_chat_id}) # NEW

    if any(word in user_input.lower() for word in ["assignment", "task", "remind"]):
        parsed = bot.parse_task_with_ai(user_input)
        if "error" in parsed:
            return jsonify({
                "reply": "⚠️ AI could not parse your task. Please rephrase.",
                "chat_id": chat_id # NEW
            })
    
        # ✅ If no actual task extracted, ask the user what the task is
        if not parsed.get("task"):
            return jsonify({
                "reply": "📝 Sure! What's the task about? (e.g. 'math homework', 'science project')",
                "chat_id": chat_id # NEW
            })
    
        # Fallback: try natural language parsing
        if parsed.get("time") == "Not set" or parsed.get("date") == "Not set":
            from ai_bot import parse_natural_time
            fallback_time, fallback_date = parse_natural_time(user_input)
            if parsed.get("time") == "Not set":
                parsed["time"] = fallback_time
            if parsed.get("date") == "Not set":
                parsed["date"] = fallback_date
    
        # If time/date still missing, store in session and ask
        if parsed.get("time") == "Not set" or parsed.get("date") == "Not set":
            session["pending_task"] = parsed["task"]
            return jsonify({
                "reply": f"📝 Got it — task: '{parsed['task']}'. When should I schedule it? (e.g. 'tomorrow at 3pm')",
                "chat_id": chat_id # NEW
            })
    
        # Everything set — save
        db.save_task(username, parsed["task"], parsed["time"], parsed["date"])
        return jsonify({
            "reply": f"✅ Task added: '{parsed['task']}' at {parsed['time']} on {parsed['date']}",
            "chat_id": chat_id # NEW
        })

    # NEW: Standard chat loop gets and returns chat_id
    reply, new_chat_id = bot.get_response(username, user_input, db, chat_id)
    return jsonify({"reply": reply, "chat_id": new_chat_id})

@app.route("/tasks")
def tasks():
    return render_template("task.html")

@app.route("/api/tasks", methods=["POST"])
def add_task():
    # Check user session
    username = session.get("user")
    if not username:
        print("No user in session!")
        return jsonify({"error": "User not logged in"}), 401

    data = request.get_json()

    # Validate data
    text = data.get("text")
    time = data.get("time")
    date = data.get("date")

    if not text or not time or not date:
        return jsonify({"error": "Missing fields"}), 400

    # Save to MongoDB
    db.save_task(username, text, time, date)

    return jsonify({"message": "Task saved"})

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    username = session.get("user")
    tasks = db.get_tasks(username)
    return jsonify(tasks)

@app.route("/api/tasks/delete", methods=["POST"])
def delete_tasks():
    data = request.json
    username = session.get("user")

    db.delete_multiple_tasks(username, data["tasks"])

    return jsonify({"message": "Deleted"})

@app.route("/schedule")
def schedule():
    return render_template("schedule.html")

# --- VISION ROUTE FOR IMAGE PROCESSING ---
@app.route("/api/analyze-image", methods=["POST"])
def api_analyze_image():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image_file = request.files["image"]
    user_prompt = request.form.get("prompt", "Describe this image.")
    chat_id = request.form.get("chat_id") # NEW: Get chat_id from FormData
    
    # NEW: Ensure a chat_id is generated if it's the very first message
    if not chat_id:
        chat_id = str(uuid.uuid4())
    
    # 1. Convert the image to a Base64 string IN MEMORY (Bypasses Render's disk limits)
    base64_image = base64.b64encode(image_file.read()).decode('utf-8')
    mime_type = image_file.content_type

    # 2. Prepare the request for Groq's Vision Model
    headers = {
        "Authorization": f"Bearer {app.config['GROQ_API_KEY']}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": user_prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{base64_image}"
                        }
                    }
                ]
            }
        ],
        "max_tokens": 1024,  # NEW: Prevents length-based 400 errors
        "temperature": 0.2   # NEW: Makes the AI more analytical 
    }
    
    try:
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        
        # Extract the AI's text response
        ai_analysis = response.json()["choices"][0]["message"]["content"]
        
        # Save the interaction to MongoDB chat history
        username = session["user"]
        messages = db.load_chat(chat_id) # NEW: load specifically by chat_id
        messages.append({"role": "user", "content": f"[Uploaded Image] {user_prompt}"})
        messages.append({"role": "assistant", "content": ai_analysis})
        
        # NEW: save specifically by chat_id
        db.save_chat(chat_id, username, messages) 
        
        # NEW: return the chat_id so frontend can keep track
        return jsonify({"reply": ai_analysis, "chat_id": chat_id})
        
    except requests.exceptions.HTTPError as e:
            print("Vision API Error:", e)
            if hasattr(e, 'response') and e.response is not None:
                print("GROQ DETAILED ERROR:", e.response.text)
            return jsonify({"error": "Failed to analyze image"}), 500
            
    except Exception as e:
        print("General Error:", e)
        return jsonify({"error": "Failed to analyze image"}), 500

# --- FOR NEW CHAT AND SESSION ---
@app.route("/api/chats", methods=["GET"])
def get_user_chats():
    if "user" not in session:
        return jsonify([]), 401
    return jsonify(db.get_user_chats(session["user"]))

@app.route("/api/chat/<chat_id>", methods=["GET"])
def load_specific_chat(chat_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    messages = db.load_chat(chat_id)
    return jsonify(messages)

@app.route("/api/chat/<chat_id>/rename", methods=["PUT"])
def rename_chat(chat_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    new_title = request.json.get("title")
    if new_title:
        db.rename_chat(chat_id, new_title)
        return jsonify({"success": True})
    return jsonify({"error": "No title provided"}), 400

@app.route("/api/chat/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    db.delete_chat(chat_id)
    return jsonify({"success": True})

@app.route("/api/chat/<chat_id>/pin", methods=["PUT"])
def toggle_pin_chat(chat_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    is_pinned = request.json.get("is_pinned", False)
    db.toggle_pin_chat(chat_id, is_pinned)
    return jsonify({"success": True})
    
if __name__ == "__main__":
    app.run(debug=True)