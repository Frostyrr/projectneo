from flask import Blueprint, request, jsonify, session, render_template, redirect
from database import Database
from config import Config
from datetime import datetime, timedelta
from extensions import reminder_service

reminder_bp = Blueprint('reminder', __name__)
db = Database(Config.MONGO_URI)

@reminder_bp.route('/reminders')
def reminders_page():
    if 'user' not in session: # FIXED
        return redirect('/login')
    
    username = session['user'] # FIXED
    
    all_reminders = reminder_service.get_reminders(username)
    tasks = reminder_service.get_tasks(username)
    
    enriched_reminders = []
    for reminder in all_reminders:
        source_type = reminder['source_type']
        source_id = reminder['source_id']
        
        if source_type == 'task':
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
    if 'user' not in session: # FIXED
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['user'] # FIXED
    reminders = reminder_service.get_reminders(username)
    return jsonify({'reminders': reminders})

@reminder_bp.route('/api/reminders/add', methods=['POST'])
def add_reminder():
    if 'user' not in session: # FIXED
        return jsonify({'error': 'Not logged in'}), 401
    
    username = session['user'] # FIXED
    data = request.json
    
    source_type = data['source_type']  
    source_id = data['source_id']
    reminder_time = data['reminder_time']
    reminder_note = data.get('reminder_note', '')
    
    reminder_service.save_reminder(username, source_type, source_id, reminder_time, reminder_note)
    return jsonify({'success': True, 'message': 'Reminder added'})

@reminder_bp.route('/api/reminders/snooze', methods=['POST'])
def snooze_reminder():
    if 'user' not in session: # FIXED
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.json
    reminder_id = data['reminder_id']
    duration = data['duration']
    
    if duration == 'tomorrow_morning':
        tomorrow = datetime.now() + timedelta(days=1)
        new_time = tomorrow.replace(hour=8, minute=0, second=0)
    elif isinstance(duration, str) and duration.endswith('Z'):
        new_time = datetime.fromisoformat(duration.replace('Z', '+00:00'))
    else:
        new_time = datetime.now() + timedelta(minutes=int(duration))
    
    reminder_service.update_reminder(reminder_id, reminder_time=new_time)
    return jsonify({'success': True, 'new_time': new_time.isoformat()})

@reminder_bp.route('/api/reminders/complete', methods=['POST'])
def complete_reminder():
    if 'user' not in session: # FIXED
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.json
    reminder_service.update_reminder(data['reminder_id'], is_completed=True)
    return jsonify({'success': True})

@reminder_bp.route('/api/reminders/dismiss', methods=['POST'])
def dismiss_reminder():
    if 'user' not in session: # FIXED
        return jsonify({'error': 'Not logged in'}), 401
    
    data = request.json
    reminder_service.update_reminder(data['reminder_id'], is_dismissed=True)
    return jsonify({'success': True})