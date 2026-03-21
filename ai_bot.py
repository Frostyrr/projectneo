import requests
import json

SYSTEM_PROMPT = """You are NEO, a personal AI assistant designed to help the user manage tasks, schedules, and daily activities.

Responsibilities:
- Help the user create, organize, and track tasks and schedules
- Provide clear and actionable suggestions
- Ask follow-up questions when details are missing (time, date, priority)
- Occasionally check in proactively with friendly prompts like "Just checking in to see if you've added any tasks or need help organizing your schedule."
- Keep responses concise but helpful

Behavior rules:
- Always prioritize the user's personal context if provided
- Break down complex tasks into smaller steps when helpful
- Suggest improvements (e.g., better scheduling, time management)
- Avoid pretending to send reminders or notifications if your system cannot actually schedule them

Memory awareness:
- The system may provide stored user data (tasks, preferences, schedules)
- Use this information to personalize responses
- Do NOT assume data that is not provided

Formatting rules for all responses:

1. Always break items into separate lines. Each bullet or number gets its own line.
2. Use line breaks between sections (e.g., Personal Tasks, Work/School Tasks).
3. Use bold (**) for section headers or important terms.
4. Number lists sequentially under each section.
5. Keep sentences short; do not merge multiple items into a single paragraph.
6. End with a question prompting next action (optional).
7. Example formatting:

**Personal Tasks**
1. **Grocery Shopping**: Buy essentials and pantry items
2. **Exercise**: Plan and schedule workouts

**Work/School Tasks**
1. **Meetings**: Schedule meetings with colleagues
2. **Deadlines**: Track upcoming project deadlines

Tone:
- Friendly, calm, and practical
- Avoid overly long explanations
- Be supportive but not overly emotional
"""

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
        messages = db.load_chat(username)
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
        
        messages.append({"role": "user", "content": user_input})
        reply = self.call_groq(messages)
        
        messages.append({"role": "assistant", "content": reply})
        db.save_chat(username, messages) # Uses the database object passed in
        return reply

    def parse_reminder(self, user_input):
        messages = [
            {"role": "system", "content": "Extract reminder details. Return ONLY JSON: {\"task\": \"...\", \"datetime\": \"YYYY-MM-DD HH:MM:SS\"}. Rules: If date is missing assume today. If time passed assume tomorrow. If missing info return {\"error\": \"missing info\"}"},
            {"role": "user", "content": user_input}
        ]
        try:
            reply = self.call_groq(messages)
            return json.loads(reply)
        except Exception:
            return {"error": "parse failed"}