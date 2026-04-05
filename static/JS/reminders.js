let currentReminderId = null;

// ------------------
// Load Reminders from API
// ------------------
async function loadReminders() {
    try {
        const res = await fetch('/api/reminders');
        const data = await res.json();
        const reminders = data.reminders || [];

        const upcoming = document.getElementById('upcomingContainer');
        const later = document.getElementById('laterContainer');
        const completed = document.getElementById('completedContainer');
        const emptyState = document.getElementById('emptyState');

        upcoming.innerHTML = '';
        later.innerHTML = '';
        completed.innerHTML = '';

        if(reminders.length === 0){
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
        }

        let upcomingCount = 0;

        reminders.forEach(rem => {
            const card = document.createElement('div');
            card.className = 'reminder-card';
            card.dataset.reminderId = rem._id;
            card.dataset.sourceType = rem.source_type;
            card.dataset.sourceId = rem.source_id;
            card.dataset.timestamp = rem.reminder_time;

            card.innerHTML = `
                <div class="reminder-icon">
                    <span class="material-symbols-rounded">${rem.source_type === 'task' ? 'task_alt' : 'school'}</span>
                </div>
                <div class="reminder-info">
                    <div class="reminder-header">
                        <h4>${rem.source_title || 'Reminder'}</h4>
                        <span class="source-badge ${rem.source_type}-badge">${rem.source_type.charAt(0).toUpperCase() + rem.source_type.slice(1)}</span>
                    </div>
                    <p class="reminder-time">${formatReminderTime(rem.reminder_time)}</p>
                    <p class="reminder-note">${rem.reminder_note || ''}</p>
                </div>
                <div class="reminder-actions">
                    <button class="action-btn" title="Snooze">Snooze</button>
                    <button class="action-btn" title="Complete">Complete</button>
                    <button class="action-btn" title="Dismiss">Dismiss</button>
                </div>
            `;

            if(rem.is_completed){
                completed.appendChild(card);
            } else if(new Date(rem.reminder_time) > new Date(Date.now() + 2*24*60*60*1000)){
                later.appendChild(card);
            } else {
                upcoming.appendChild(card);
                upcomingCount++;
            }
        });

        document.getElementById('reminderCount').textContent = `${upcomingCount} upcoming`;

    } catch(err){
        console.error('Failed to load reminders:', err);
    }
}

// ------------------
// Helper: Format Time
// ------------------
function formatReminderTime(timestamp){
    if(!timestamp) return 'Not set';
    const now = new Date();
    const t = new Date(timestamp);
    const diff = t - now;
    if(diff < 0) return 'Overdue';
    const diffMins = Math.floor(diff/60000);
    if(diffMins < 60) return `in ${diffMins} mins`;
    const diffHours = Math.floor(diff/3600000);
    if(diffHours < 24) return `Today, ${t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    const diffDays = Math.floor(diff/86400000);
    if(diffDays === 1) return `Tomorrow, ${t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    if(diffDays < 7) return `${t.toLocaleDateString([], {weekday:'long'})}, ${t.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    return t.toLocaleDateString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
}

// ------------------
// Toggle Completed Section
// ------------------
function toggleCompleted(){
    const section = document.getElementById("completedContainer");
    const icon = document.querySelector(".toggle-icon");
    if(section.style.display === "none"){
        section.style.display = "block";
        icon.textContent = "expand_less";
    } else {
        section.style.display = "none";
        icon.textContent = "expand_more";
    }
}

// ------------------
// Initialize
// ------------------
document.addEventListener('DOMContentLoaded', () => {
    loadReminders();
    setInterval(loadReminders, 60000); // Refresh every minute
});