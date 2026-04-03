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

// Initial load
loadTasks();