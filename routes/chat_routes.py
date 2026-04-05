from flask import Blueprint, render_template, request, jsonify, session
import base64
import uuid
from extensions import db, bot
from ai_bot import parse_natural_time

# Blueprint for all chat-related API routes
chat_bp = Blueprint('chat', __name__)

# ====================
# CHAT INTERFACE ROUTE
# ====================
@chat_bp.route("/api/chat", methods=["POST"])
def api_chat():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_input = request.json.get("message")
    chat_id = request.json.get("chat_id")
    username = session["user"]

    # Always ensure chat_id is valid
    if not chat_id:
        chat_id = str(uuid.uuid4())

    def save_to_history(reply):
        messages = db.load_chat(chat_id) or []
        messages.append({"role": "user", "content": user_input})
        messages.append({"role": "assistant", "content": reply})
        title = None
        if len(messages) <= 2:
            title = user_input[:25] + "..." if len(user_input) > 25 else user_input
        db.save_chat(chat_id, username, messages, title=title)

    # ==============================
    # STEP 3: CONFIRM THE UPDATE
    # ==============================
    if "pending_update" in session:
        pending = session["pending_update"]
        yes_phrases = ["yes", "yeah", "ok", "okay", "confirm", "sure", "do it", "go ahead", "yep"]
        no_phrases = ["no", "cancel", "never mind", "nope", "stop", "don't"]

        if any(p in user_input.lower() for p in yes_phrases):
            session.pop("pending_update")
            success = db.update_task(username, pending["task_id"], pending["updates"])
            reply = "✅ Task updated!" if success else "⚠️ Couldn't update that task. It may have been deleted."
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        elif any(p in user_input.lower() for p in no_phrases):
            session.pop("pending_update")
            reply = "👍 No changes made. Anything else?"
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        else:
            reply = "Should I go ahead with the update? (yes / no)"
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

    # ==============================
    # STEP 2: USER DESCRIBED CHANGE
    # Ask AI to parse what to update
    # ==============================
    if "pending_update_task_id" in session:
        task_id = session.pop("pending_update_task_id")
        existing_tasks = db.get_tasks(username)
        matched_task = next((t for t in existing_tasks if t.get("id") == task_id), None)

        if not matched_task:
            reply = "⚠️ That task no longer exists."
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        parsed = bot.parse_task_update_with_ai(user_input, [matched_task])
        updates = parsed.get("updates", {})

        if not updates:
            session["pending_update_task_id"] = task_id
            reply = f"What would you like to change about **{matched_task['text']}**? (name, time, or date)"
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        change_summary = []
        if "text" in updates:
            change_summary.append(f"name → '{updates['text']}'")
        if "time" in updates:
            change_summary.append(f"time → {updates['time']}")
        if "date" in updates:
            change_summary.append(f"date → {updates['date']}")

        session["pending_update"] = {"task_id": task_id, "updates": updates}
        reply = f"📝 Update **{matched_task['text']}**: {', '.join(change_summary)}. Confirm? (yes / no)"
        save_to_history(reply)
        return jsonify({"reply": reply, "chat_id": chat_id})

    # ==============================
    # STEP 1: DETECT UPDATE INTENT
    # Show task list for user to pick
    # ==============================
    update_keywords = ["update", "change", "edit", "modify", "reschedule", "rename", "move"]
    if any(word in user_input.lower() for word in update_keywords):
        # ✅ CLEAR SESSION ONLY WHEN STARTING A NEW UPDATE
        session.pop("pending_update_task_id", None)
        session.pop("pending_update", None)
        
        existing_tasks = db.get_tasks(username)

        if not existing_tasks:
            reply = "📭 You have no tasks to update yet."
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        task_list = [{
            "id": t.get("id") or t.get("_id"),
            "text": t.get("text", "Unnamed Task"),
            "time": t.get("time", "Not set"),
            "date": t.get("date", "Not set")
        } for t in existing_tasks]
        reply = "Which task would you like to update?"
        save_to_history(reply)
        return jsonify({"reply": reply, "chat_id": chat_id, "task_list": task_list})

    # ===========================
    # HANDLE PENDING TASK DESC
    # ===========================
    if session.pop("pending_task_description", False):
        session["pending_task"] = user_input
        reply = f"📝 Got it — task: '{user_input}'. When should I schedule it?"
        save_to_history(reply)
        return jsonify({"reply": reply, "chat_id": chat_id})

    # =========================
    # HANDLE PENDING TASK STATE
    # =========================
    if "pending_task" in session:
        no_schedule_phrases = ["no", "not yet", "later", "skip", "no schedule", "none", "nope", "not now"]

        if any(phrase in user_input.lower() for phrase in no_schedule_phrases):
            task_text = session.pop("pending_task")
            db.save_task(username, task_text, "Not set", "Not set")
            reply = f"✅ Got it! I've saved '{task_text}' without a schedule. You can set a time later. What else can I help you with?"
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        fallback_time, fallback_date = parse_natural_time(user_input)

        if fallback_time != "Not set" and fallback_date != "Not set":
            task_text = session.pop("pending_task")
            db.save_task(username, task_text, fallback_time, fallback_date)
            reply = f"✅ Task added: '{task_text}' at {fallback_time} on {fallback_date}"
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        else:
            session.pop("pending_task")
            reply, _ = bot.get_response(username, user_input, db, chat_id)
            return jsonify({"reply": reply, "chat_id": chat_id})

    # ========================
    # TASK / REMINDER DETECTOR
    # ========================
    if any(word in user_input.lower() for word in ["assignment", "task", "remind"]):
        parsed = bot.parse_task_with_ai(user_input)

        if "error" in parsed:
            reply = "⚠️ AI could not parse your task. Please rephrase."
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        if not parsed.get("task"):
            session["pending_task_description"] = True
            reply = "📝 Sure! What's the task about?"
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        if parsed.get("time") == "Not set" or parsed.get("date") == "Not set":
            fallback_time, fallback_date = parse_natural_time(user_input)
            if parsed.get("time") == "Not set":
                parsed["time"] = fallback_time
            if parsed.get("date") == "Not set":
                parsed["date"] = fallback_date

        if parsed.get("time") == "Not set" or parsed.get("date") == "Not set":
            session["pending_task"] = parsed["task"]
            reply = f"📝 Got it — task: '{parsed['task']}'. When should I schedule it?"
            save_to_history(reply)
            return jsonify({"reply": reply, "chat_id": chat_id})

        db.save_task(username, parsed["task"], parsed["time"], parsed["date"])
        reply = f"✅ Task added: '{parsed['task']}' at {parsed['time']} on {parsed['date']}"
        save_to_history(reply)
        return jsonify({"reply": reply, "chat_id": chat_id})

    # ====================
    # NORMAL AI CHAT FLOW
    # ====================
    reply, _ = bot.get_response(username, user_input, db, chat_id)
    return jsonify({"reply": reply, "chat_id": chat_id})

# ==============
# IMAGE ANALYZER
# ==============
@chat_bp.route("/api/analyze-image", methods=["POST"])
def api_analyze_image():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    image_file = request.files["image"]
    user_prompt = request.form.get("prompt", "Describe this image.")
    chat_id = request.form.get("chat_id")
    if not chat_id:
        chat_id = str(uuid.uuid4())
    base64_image = base64.b64encode(image_file.read()).decode('utf-8')
    mime_type = image_file.content_type
    try:
        ai_analysis = bot.analyze_image(base64_image, mime_type, user_prompt)
        username = session["user"]
        messages = db.load_chat(chat_id)
        messages.append({"role": "user", "content": f"[Uploaded Image] {user_prompt}"})
        messages.append({"role": "assistant", "content": ai_analysis})
        db.save_chat(chat_id, username, messages)
        return jsonify({"reply": ai_analysis, "chat_id": chat_id})
    except Exception as e:
        print("General Error:", e)
        return jsonify({"error": "Failed to analyze image"}), 500

# =====================
# HANDLE TASK SELECTION
# Called from frontend when user clicks a task button
# =====================
@chat_bp.route("/api/chat/select-task", methods=["POST"])
def select_task_to_update():
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    task_id = request.json.get("task_id")
    chat_id = request.json.get("chat_id")
    username = session["user"]

    if not task_id:
        return jsonify({"error": "No task selected"}), 400

    existing_tasks = db.get_tasks(username)
    matched_task = next((t for t in existing_tasks if t["id"] == task_id), None)

    if not matched_task:
        return jsonify({"reply": "⚠️ Task not found.", "chat_id": chat_id})

    session["pending_update_task_id"] = task_id
    reply = f"What would you like to change about **{matched_task['text']}**? You can update the name, time, or date."
    return jsonify({"reply": reply, "chat_id": chat_id})

# =====================
# GET USER CHAT LIST
# =====================
@chat_bp.route("/api/chats", methods=["GET"])
def get_user_chats():
    if "user" not in session:
        return jsonify([]), 401
    return jsonify(db.get_user_chats(session["user"]))

# =====================
# LOAD SPECIFIC CHAT
# =====================
@chat_bp.route("/api/chat/<chat_id>", methods=["GET"])
def load_specific_chat(chat_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(db.load_chat(chat_id))

# =====================
# RENAME CHAT
# =====================
@chat_bp.route("/api/chat/<chat_id>/rename", methods=["PUT"])
def rename_chat(chat_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    new_title = request.json.get("title")
    if new_title:
        db.rename_chat(chat_id, new_title)
        return jsonify({"success": True})
    return jsonify({"error": "No title provided"}), 400

# =====================
# DELETE CHAT
# =====================
@chat_bp.route("/api/chat/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    db.delete_chat(chat_id)
    return jsonify({"success": True})

# =====================
# PIN / UNPIN CHAT
# =====================
@chat_bp.route("/api/chat/<chat_id>/pin", methods=["PUT"])
def toggle_pin_chat(chat_id):
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    is_pinned = request.json.get("is_pinned", False)
    db.toggle_pin_chat(chat_id, is_pinned)
    return jsonify({"success": True})