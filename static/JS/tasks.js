const taskInput = document.getElementById("taskInput");
const timeInput = document.getElementById("timeInput");
const dateInput = document.getElementById("dateInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const deleteTaskBtn = document.getElementById("deleteTaskBtn");

let tasks = []; // We'll load from DB
let editIndex = null;
let deleteMode = false;

// Fetch tasks from backend on page load
function loadTasks() {
    fetch("/api/tasks", {
        method: "GET",
        credentials: "same-origin"
    })
    .then(res => res.json())
    .then(data => {
        tasks = data;
        renderTasks();
    })
    .catch(err => console.error("Failed to load tasks:", err));
}

// Render tasks
function renderTasks() {
    const tbody = document.querySelector("#tasksTable tbody");
    const headerRow = document.getElementById("tasksHeaderRow");

    tbody.innerHTML = "";
    headerRow.innerHTML = "";

    if (deleteMode && tasks.length > 0) {
        const thCheckbox = document.createElement("th");
        headerRow.appendChild(thCheckbox);
    }

    ["Task", "Time", "Date"].forEach(text => {
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
    });

    tasks.forEach((task, index) => {
        const tr = document.createElement("tr");

        if (deleteMode) {
            const tdCheckbox = document.createElement("td");
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.classList.add("taskCheckbox");
            cb.dataset.index = index;
            tdCheckbox.appendChild(cb);
            tr.appendChild(tdCheckbox);
        }

        ["text", "time", "date"].forEach(key => {
            const td = document.createElement("td");
            td.textContent = task[key];
            tr.appendChild(td);
        });

        // Row click to edit
        tr.addEventListener("click", (e) => {
            if (deleteMode || e.target.type === "checkbox") return;
            editTask(index);
            document.querySelectorAll("#tasksTable tbody tr").forEach(r => r.classList.remove("selected"));
            tr.classList.add("selected");
        });

        tbody.appendChild(tr);
    });
}

addTaskBtn.addEventListener("click", () => {
    const text = taskInput.value.trim();
    const time = timeInput.value;
    const date = dateInput.value;

    if (!text) return alert("Please enter a task");

    const finalTime = time || "Not set";
    const finalDate = date || "Not set";

    const taskData = { text, time: finalTime, date: finalDate };

    const saveTask = () => {
        fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskData),
            credentials: "same-origin"
        })
        .then(res => res.json())
        .then(data => {
            loadTasks();
            clearInputs();
            addTaskBtn.textContent = "Add Task";
            editIndex = null;
            deleteMode = false;
        })
        .catch(err => console.error("Task save error:", err));
    };

    if (editIndex !== null) {
        const oldTask = tasks[editIndex];
        fetch("/api/tasks/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tasks: [oldTask] }),
            credentials: "same-origin"
        })
        .then(() => saveTask())
        .catch(err => console.error("Task update error:", err));
    } else {
        saveTask();
    }
});

// Delete button toggles delete mode or deletes selected tasks
deleteTaskBtn.addEventListener("click", () => {
    if (tasks.length === 0) return alert("No tasks to delete!");

    const checked = document.querySelectorAll(".taskCheckbox:checked");

    if (!deleteMode) {
        // First click: enter delete mode
        deleteMode = true;
        renderTasks();
    } else {
        if (checked.length === 0) {
            // Second click with no selection: exit delete mode
            deleteMode = false;
            renderTasks();
        } else {
            // Delete selected tasks
            if (confirm("Are you sure you want to delete the selected tasks?")) {
                const indexes = Array.from(checked).map(cb => parseInt(cb.dataset.index));
                const tasksToDelete = indexes.map(i => tasks[i]);

                fetch("/api/tasks/delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tasks: tasksToDelete }),
                    credentials: "same-origin"
                })
                .then(res => res.json())
                .then(() => loadTasks())
                .catch(err => console.error("Delete error:", err));
            }
        }
    }
});

// Edit task
function editTask(index) {
    const task = tasks[index];
    taskInput.value = task.text;
    timeInput.value = task.time;
    dateInput.value = task.date;
    editIndex = index;
    addTaskBtn.textContent = "Update Task";
}

// Clear inputs
function clearInputs() {
    taskInput.value = "";
    timeInput.value = "";
    dateInput.value = "";
}

function addReminderToTask(taskText, taskTime, taskDate) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <span class="material-symbols-rounded">notification_add</span>
                <h3>Add Reminder</h3>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 16px; color: #a0a0a0;">Remind me about: <strong style="color: #e3e3e3;">${taskText}</strong></p>
                <div class="reminder-presets">
                    <button class="reminder-preset-btn" onclick="setTaskReminder('${taskText}', '${taskTime}', '${taskDate}', 1, 'day')">1 day before</button>
                    <button class="reminder-preset-btn" onclick="setTaskReminder('${taskText}', '${taskTime}', '${taskDate}', 2, 'day')">2 days before</button>
                    <button class="reminder-preset-btn" onclick="setTaskReminder('${taskText}', '${taskTime}', '${taskDate}', 1, 'week')">1 week before</button>
                    <button class="reminder-preset-btn" onclick="setTaskReminder('${taskText}', '${taskTime}', '${taskDate}', 1, 'hour')">1 hour before</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="cancel-modal-btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function setTaskReminder(taskText, taskTime, taskDate, amount, unit) {
    // Calculate reminder time
    const taskDateTime = new Date(`${taskDate}T${taskTime}`);
    let reminderTime;
    
    switch(unit) {
        case 'day':
            reminderTime = new Date(taskDateTime.getTime() - (amount * 24 * 60 * 60 * 1000));
            break;
        case 'week':
            reminderTime = new Date(taskDateTime.getTime() - (amount * 7 * 24 * 60 * 60 * 1000));
            break;
        case 'hour':
            reminderTime = new Date(taskDateTime.getTime() - (amount * 60 * 60 * 1000));
            break;
    }
    
    const sourceId = `${taskText}_${taskDate}_${taskTime}`;
    
    fetch('/api/reminders/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
            source_type: 'task',
            source_id: sourceId,
            reminder_time: reminderTime.toISOString(),
            reminder_note: `${amount} ${unit}${amount > 1 ? 's' : ''} before deadline`
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Reminder added!');
            document.querySelector('.modal-overlay').remove();
        }
    })
    .catch(err => console.error('Reminder error:', err));
}

// Modify renderTasks to add reminder button
function renderTasks() {
    const tbody = document.querySelector("#tasksTable tbody");
    const headerRow = document.getElementById("tasksHeaderRow");

    tbody.innerHTML = "";
    headerRow.innerHTML = "";

    if (deleteMode && tasks.length > 0) {
        const thCheckbox = document.createElement("th");
        headerRow.appendChild(thCheckbox);
    }

    ["Task", "Time", "Date", ""].forEach(text => {  // Added empty header for actions
        const th = document.createElement("th");
        th.textContent = text;
        headerRow.appendChild(th);
    });

    tasks.forEach((task, index) => {
        const tr = document.createElement("tr");

        if (deleteMode) {
            const tdCheckbox = document.createElement("td");
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.classList.add("taskCheckbox");
            cb.dataset.index = index;
            tdCheckbox.appendChild(cb);
            tr.appendChild(tdCheckbox);
        }

        ["text", "time", "date"].forEach(key => {
            const td = document.createElement("td");
            td.textContent = task[key];
            tr.appendChild(td);
        });

        // Add reminder button column
        const tdActions = document.createElement("td");
        const reminderBtn = document.createElement("button");
        reminderBtn.className = "reminder-btn";
        reminderBtn.innerHTML = '<span class="material-symbols-rounded">notifications</span>';
        reminderBtn.onclick = (e) => {
            e.stopPropagation();
            addReminderToTask(task.text, task.time, task.date);
        };
        tdActions.appendChild(reminderBtn);
        tr.appendChild(tdActions);

        // Row click to edit
        tr.addEventListener("click", (e) => {
            if (deleteMode || e.target.type === "checkbox" || e.target.closest('.reminder-btn')) return;
            editTask(index);
            document.querySelectorAll("#tasksTable tbody tr").forEach(r => r.classList.remove("selected"));
            tr.classList.add("selected");
        });

        tbody.appendChild(tr);
    });
}


// Initial load
loadTasks();

