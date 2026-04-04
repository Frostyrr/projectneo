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
# Handles the main chat interaction between the user and the AI assistant.
# Receives the user's message, processes tasks/reminders, and returns the AI reply.
@chat_bp.route("/api/chat", methods=["POST"])
def api_chat():
    # Ensure the user is logged in before allowing chat access
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    # Get user message and chat session ID from the frontend
    user_input = request.json.get("message")
    chat_id = request.json.get("chat_id") 
    username = session["user"]

    # =========================
    # HANDLE PENDING TASK STATE
    # =========================
    # If the system previously asked the user for a schedule (time/date),
    # the task text is temporarily stored in session["pending_task"].
    if "pending_task" in session:
        # Phrases indicating the user does NOT want to schedule the task yet
        no_schedule_phrases = ["no", "not yet", "later", "skip", "no schedule", "none", "nope", "not now"]

        # If user refuses scheduling, save task without time/date
        if any(phrase in user_input.lower() for phrase in no_schedule_phrases):
            task_text = session.pop("pending_task")

            # Save task with default "Not set" schedule
            db.save_task(username, task_text, "Not set", "Not set") 

            return jsonify({
                "reply": f"✅ Got it! I've saved '{task_text}' without a schedule. You can set a time later. What else can I help you with?",
                "chat_id": chat_id 
            })

        # Try extracting time/date using natural language parser
        fallback_time, fallback_date = parse_natural_time(user_input)

        # If valid schedule detected, save task with time/date
        if fallback_time != "Not set" and fallback_date != "Not set":
            task_text = session.pop("pending_task")
            db.save_task(username, task_text, fallback_time, fallback_date)

            return jsonify({
                "reply": f"✅ Task added: '{task_text}' at {fallback_time} on {fallback_date}",
                "chat_id": chat_id
            })

        # If the input isn't a schedule, treat it as a normal chat message
        else:
            task_text = session.pop("pending_task")
            reply, new_chat_id = bot.get_response(username, user_input, db, chat_id)

            return jsonify({"reply": reply, "chat_id": new_chat_id})

    # ========================
    # TASK / REMINDER DETECTOR
    # ========================
    # Detects if the user's message likely refers to a task or reminder.
    if any(word in user_input.lower() for word in ["assignment", "task", "remind"]):

        # Use AI to extract structured task data (task, date, time)
        parsed = bot.parse_task_with_ai(user_input)

        # If AI fails to parse the task
        if "error" in parsed:
            return jsonify({"reply": "⚠️ AI could not parse your task. Please rephrase.", "chat_id": chat_id})
    
        # If no task text detected
        if not parsed.get("task"):
            return jsonify({"reply": "📝 Sure! What's the task about?", "chat_id": chat_id})
    
        # If AI couldn't detect date/time, try rule-based natural parser
        if parsed.get("time") == "Not set" or parsed.get("date") == "Not set":
            fallback_time, fallback_date = parse_natural_time(user_input)

            if parsed.get("time") == "Not set":
                parsed["time"] = fallback_time

            if parsed.get("date") == "Not set":
                parsed["date"] = fallback_date
    
        # If still missing schedule, ask the user for it
        if parsed.get("time") == "Not set" or parsed.get("date") == "Not set":
            session["pending_task"] = parsed["task"]

            return jsonify({
                "reply": f"📝 Got it — task: '{parsed['task']}'. When should I schedule it?",
                "chat_id": chat_id
            })
    
        # Save task if everything is complete
        db.save_task(username, parsed["task"], parsed["time"], parsed["date"])

        return jsonify({
            "reply": f"✅ Task added: '{parsed['task']}' at {parsed['time']} on {parsed['date']}",
            "chat_id": chat_id
        })

    # ====================
    # NORMAL AI CHAT FLOW
    # ====================
    # If the message is not task-related, send it directly to the AI model
    reply, new_chat_id = bot.get_response(username, user_input, db, chat_id)

    return jsonify({"reply": reply, "chat_id": new_chat_id})


# ==============
# IMAGE ANALYZER
# ==============
# Allows users to upload an image and ask the AI to analyze it.
# Example use cases: reading schedules, describing images, etc.
@chat_bp.route("/api/analyze-image", methods=["POST"])
def api_analyze_image():

    # Ensure the user is logged in
    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    # Check if an image file was uploaded
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    # Retrieve uploaded image and optional user prompt
    image_file = request.files["image"]
    user_prompt = request.form.get("prompt", "Describe this image.")
    chat_id = request.form.get("chat_id")
    
    # If chat_id does not exist yet, create a new one
    if not chat_id:
        chat_id = str(uuid.uuid4())
    
    # Convert image into base64 format so it can be sent to the AI model
    base64_image = base64.b64encode(image_file.read()).decode('utf-8')
    mime_type = image_file.content_type

    try:
        # Send image to AI model for analysis
        ai_analysis = bot.analyze_image(base64_image, mime_type, user_prompt)
        
        username = session["user"]

        # Load existing chat history
        messages = db.load_chat(chat_id)

        # Add the image prompt and AI response to chat history
        messages.append({"role": "user", "content": f"[Uploaded Image] {user_prompt}"})
        messages.append({"role": "assistant", "content": ai_analysis})
        
        # Save updated chat history
        db.save_chat(chat_id, username, messages) 
        
        return jsonify({"reply": ai_analysis, "chat_id": chat_id})

    except Exception as e:
        print("General Error:", e)
        return jsonify({"error": "Failed to analyze image"}), 500


# =====================
# GET USER CHAT LIST
# =====================
# Returns all chats belonging to the logged-in user
# Used for populating the sidebar chat history.
@chat_bp.route("/api/chats", methods=["GET"])
def get_user_chats():

    if "user" not in session:
        return jsonify([]), 401

    return jsonify(db.get_user_chats(session["user"]))


# =====================
# LOAD SPECIFIC CHAT
# =====================
# Returns all messages inside a specific chat conversation.
@chat_bp.route("/api/chat/<chat_id>", methods=["GET"])
def load_specific_chat(chat_id):

    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    return jsonify(db.load_chat(chat_id))


# =====================
# RENAME CHAT
# =====================
# Allows the user to rename a chat conversation (e.g., in sidebar).
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
# Permanently deletes a chat conversation and its messages.
@chat_bp.route("/api/chat/<chat_id>", methods=["DELETE"])
def delete_chat(chat_id):

    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    db.delete_chat(chat_id)

    return jsonify({"success": True})


# =====================
# PIN / UNPIN CHAT
# =====================
# Allows users to pin important chats to the top of the sidebar.
@chat_bp.route("/api/chat/<chat_id>/pin", methods=["PUT"])
def toggle_pin_chat(chat_id):

    if "user" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    # Frontend sends whether the chat should be pinned or not
    is_pinned = request.json.get("is_pinned", False)

    db.toggle_pin_chat(chat_id, is_pinned)

    return jsonify({"success": True})