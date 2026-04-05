import requests
import json
import dateparser
from datetime import datetime
import uuid
import pytz

ph_tz = pytz.timezone("Asia/Manila")
now_ph = datetime.now(ph_tz)

SYSTEM_PROMPT = f"""You are NEO, a personal AI assistant designed to help the user manage tasks, schedules, and daily activities.

Current date and time in the Philippines: {now_ph.strftime("%A, %B %d, %Y %I:%M %p")} (PHT)

Responsibilities:
- Help the user create, organize, and track tasks and schedules
- Provide clear and actionable suggestions
- Ask follow-up questions when details are missing (time, date, priority)
- Occasionally check in proactively with friendly prompts like "Just checking in to see if you've added any tasks or need help organizing your schedule."
- Keep responses concise but helpful

Memory awareness:
- The system may provide stored user data (tasks, preferences, schedules)
- Use this information to personalize responses
- Do NOT assume data that is not provided

Formatting rules:
- Keep answers short and clear
- End with a question prompting next action (optional)
"""

def parse_natural_time(time_str):
    """
    Convert natural language time/date into HH:MM:SS and YYYY-MM-DD.
    Returns "Not set" if parsing fails.
    """
    ph_tz = pytz.timezone("Asia/Manila")
    dt = dateparser.parse(time_str, settings={
        "TIMEZONE": "Asia/Manila",
        "RETURN_AS_TIMEZONE_AWARE": True,
        "PREFER_DAY_OF_MONTH": "first"
    })
    if dt:
        dt = dt.astimezone(ph_tz)
        return dt.strftime("%H:%M:%S"), dt.strftime("%Y-%m-%d")
    return "Not set", "Not set"

class NeoAssistant:
    def __init__(self, api_key, api_url):
        self.api_key = api_key
        self.api_url = api_url

    def call_groq(self, messages):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": messages
        }
        try:
            response = requests.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print("GROQ ERROR:", e)
            return "Error from AI"

    # NEW: Added chat_id as a parameter with a default value of None
    def get_response(self, username, user_input, db, chat_id=None):
        try:
            if not chat_id:
                chat_id = str(uuid.uuid4())

            if any(word in user_input.lower() for word in ["task", "assignment", "remind", "schedule"]):
                parsed = self.parse_task_with_ai(user_input)
                task_text = parsed.get("task", "").strip()
                task_time = parsed.get("time", "")
                task_date = parsed.get("date", "")

                if task_time == "Not set" or task_date == "Not set":
                    task_time, task_date = parse_natural_time(user_input)

                if task_text:
                    db.save_task(username, task_text, task_time, task_date)
                    if task_time != "Not set" and task_date != "Not set":
                        return f"I’ve added your task '{task_text}' on {task_date} at {task_time}.", chat_id
                    else:
                        return f"Ok, noted '{task_text}'. What else would you like to add or schedule?", chat_id

                return "Got it 👍 Please provide the task details.", chat_id
    
            # --- NORMAL CHAT FLOW ---
            full_messages = db.load_chat(chat_id)
            
            # Create a context window for the AI (only the last 10 messages)
            context = full_messages[-10:] if len(full_messages) > 10 else full_messages.copy()
            if not context or context[0].get("role") != "system":
                context.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
    
            context.append({"role": "user", "content": user_input})
            reply = self.call_groq(context)
            
            # Append to the FULL message history for the database
            full_messages.append({"role": "user", "content": user_input})
            full_messages.append({"role": "assistant", "content": reply})
            
            # Generate a title if this is a brand new chat
            title = None
            if len(full_messages) <= 2: # First interaction
                title = user_input[:25] + "..." if len(user_input) > 25 else user_input
            
            db.save_chat(chat_id, username, full_messages, title=title)
            return reply, chat_id
    
        except Exception as e:
            print("ERROR:", e)
            return "⚠️ Something went wrong.", chat_id

    def parse_task_with_ai(self, message):
        messages = [
            {
                "role": "system",
                "content": """Extract the actionable task from the user message.
    Return ONLY valid JSON, no markdown, no backticks:
    {
      "task": "the task text or empty string if vague",
      "time": "HH:MM:SS or Not set",
      "date": "YYYY-MM-DD or Not set"
    }
    Rules:
    - Remove filler words like 'I have a task', 'Hey AI', 'can you', etc.
    - If the message is just saying they have a task with NO subject (e.g. 'i have a task', 'add a task', 'i have an assignment'), return "task": ""
    - A valid task must have a concrete subject like 'math homework', 'doctor appointment', 'buy groceries'
    - If time/date missing → "Not set"
    - Do NOT return explanations, markdown, or backticks
    """
            },
            {"role": "user", "content": message}
        ]
    
        try:
            reply = self.call_groq(messages)
            reply = reply.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            parsed = json.loads(reply)
    
            task_text = parsed.get("task", "").strip()
            parsed["time"] = parsed.get("time", "Not set")
            parsed["date"] = parsed.get("date", "Not set")
    
            if not task_text:
                parsed["task"] = ""
    
            return parsed
        except Exception as e:
            print("AI PARSE ERROR:", e)
            return {"task": "", "time": "Not set", "date": "Not set"}
    
    def analyze_image(self, base64_image, mime_type, user_prompt):
        headers = {
            "Authorization": f"Bearer {self.api_key}",
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
            "max_tokens": 1024,
            "temperature": 0.2
        }
        
        try:
            # Note: Hardcoded specific endpoint for vision model as per your original code
            response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print("Vision API Error:", e)
            raise e
    def parse_task_update_with_ai(self, message, existing_tasks):
        task_list_str = "\n".join(
            [f"- ID: {t['id']}, Text: {t['text']}, Time: {t['time']}, Date: {t['date']}" for t in existing_tasks]
        )
    
        messages = [
            {
                "role": "system",
                "content": f"""You help update tasks in a task manager.
    
    Here are the user's current tasks:
    {task_list_str}
    
    Extract what the user wants to change. Return ONLY valid JSON, no markdown, no backticks:
    {{
      "task_id": <integer id of the matched task or null>,
      "updates": {{
        "text": "new name or null",
        "time": "HH:MM:SS or null",
        "date": "YYYY-MM-DD or null"
      }}
    }}
    Only include fields the user wants to change. Use null for unchanged fields.
    """
            },
            {"role": "user", "content": message}
        ]
    
        try:
            reply = self.call_groq(messages)
            reply = reply.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            parsed = json.loads(reply)
            parsed["updates"] = {k: v for k, v in parsed.get("updates", {}).items() if v is not None}
            return parsed
        except Exception as e:
            print("AI UPDATE PARSE ERROR:", e)
            return {"task_id": None, "updates": {}}