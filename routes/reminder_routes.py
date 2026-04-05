from flask import Blueprint, request, jsonify, session, render_template, redirect
from database import Database
from config import Config
from datetime import datetime, timedelta

reminder_bp = Blueprint('reminder', __name__)
db = Database(Config.MONGO_URI)

@reminder_bp.route('/reminders')
def reminders_page():
    if 'username' not in session:
        return redirect('/login')
    
    username = session['username']
    
    # Get all reminders
    all_reminders = db.get_reminders(username)
    
    # Get all tasks and classes to link with reminders
    tasks = db.get_tasks(username)
    
    # Enrich reminders with source details
    enriched_reminders = []
    for reminder in all_reminders:
        source_type = reminder['source_type']
        source_id = reminder['source_id']
        
        # Find the source (task or class)
        if source_type == 'task':
            # Parse source_id to find matching task
            parts = source_id.split('_')
            if len(parts) >= 3:
                task_text = '_'.join(parts[:-2])
                task_date = parts[-2]
                task_time = parts[-1]
                
                matching_task = next(
                    (t for t in tasks if t['text'] == task_text and 
                     t['date'] == task_date and t['time'] == task_time),
                    None
                )
                
                if matching_task:
                    reminder['source_title'] = matching_task['text']
                    reminder['source_details'] = f"Due: {matching_task['date']} at {matching_task['time']}"
        
        enriched_reminders.append(reminder)
    
    return render_template('reminders.html', reminders=enriched_reminders)

@reminder_bp.route('/api/reminders', methods=['GET'])
def get_reminders_api():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['username']
    reminders = db.get_reminders(username)
    
    return jsonify({'reminders': reminders})

@reminder_bp.route('/api/reminders/add', methods=['POST'])
def add_reminder():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['username']
    data = request.json
    
    source_type = data['source_type']  # 'task' or 'class'
    source_id = data['source_id']
    reminder_time = data['reminder_time']
    reminder_note = data.get('reminder_note', '')
    
    db.save_reminder(username, source_type, source_id, reminder_time, reminder_note)
    
    return jsonify({'success': True, 'message': 'Reminder added'})

@reminder_bp.route('/api/reminders/snooze', methods=['POST'])
def snooze_reminder():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.json
    reminder_id = data['reminder_id']
    duration = data['duration']
    
    # Calculate new time
    if duration == 'tomorrow_morning':
        tomorrow = datetime.now() + timedelta(days=1)
        new_time = tomorrow.replace(hour=8, minute=0, second=0)
    elif isinstance(duration, str) and duration.endswith('Z'):
        # ISO format datetime string
        new_time = datetime.fromisoformat(duration.replace('Z', '+00:00'))
    else:
        # Duration in minutes
        new_time = datetime.now() + timedelta(minutes=int(duration))
    
    db.update_reminder(reminder_id, reminder_time=new_time)
    
    return jsonify({'success': True, 'new_time': new_time.isoformat()})

@reminder_bp.route('/api/reminders/complete', methods=['POST'])
def complete_reminder():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.json
    reminder_id = data['reminder_id']
    
    db.update_reminder(reminder_id, is_completed=True)
    
    return jsonify({'success': True})

@reminder_bp.route('/api/reminders/dismiss', methods=['POST'])
def dismiss_reminder():
    if 'username' not in session:
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.json
    reminder_id = data['reminder_id']
    
    db.update_reminder(reminder_id, is_dismissed=True)
    
    return jsonify({'success': True})