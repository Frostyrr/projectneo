import requests
import json
import dateparser
from datetime import datetime

SYSTEM_PROMPT = """You are NEO, a personal AI assistant designed to help the user manage tasks, schedules, and daily activities.

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
    dt = dateparser.parse(time_str)
    if dt:
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

    def get_response(self, username, user_input, db):
        try:
            if any(word in user_input.lower() for word in ["task", "assignment", "remind", "schedule"]):
                parsed = self.parse_task_with_ai(user_input)
                task_text = parsed.get("task", "").strip()
                task_time = parsed.get("time", "")
                task_date = parsed.get("date", "")

                # Try to parse natural language time/date
                if task_time == "Not set" or task_date == "Not set":
                    task_time, task_date = parse_natural_time(user_input)

                if task_text:
                    db.save_task(username, task_text, task_time, task_date)

                    if task_time != "Not set" and task_date != "Not set":
                        return f"I’ve added your task '{task_text}' on {task_date} at {task_time}."
                    else:
                        return f"Ok, noted '{task_text}'. What else would you like to add or schedule?"

                return "Got it 👍 Please provide the task details."
    
            # fallback to normal chat
            messages = db.load_chat(username)
            if not messages or messages[0].get("role") != "system":
                messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
    
            messages.append({"role": "user", "content": user_input})
            reply = self.call_groq(messages)
            messages.append({"role": "assistant", "content": reply})
            db.save_chat(username, messages)
            return reply
    
        except Exception as e:
            print("ERROR:", e)
            return "⚠️ Something went wrong."

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
    - If no concrete task is present (e.g. just "i have a task" with no subject), return "task": ""
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
    
            # ✅ If task is empty, don't fallback to raw message — return empty
            if not task_text:
                parsed["task"] = ""
    
            return parsed
        except Exception as e:
            print("AI PARSE ERROR:", e)
            return {"task": "", "time": "Not set", "date": "Not set"}