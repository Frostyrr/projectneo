const taskInput = document.getElementById("taskInput");
const timeInput = document.getElementById("timeInput");
const dateInput = document.getElementById("dateInput");
const addTaskBtn = document.getElementById("addTaskBtn");
const deleteTaskBtn = document.getElementById("deleteTaskBtn");

let tasks = [];
let editIndex = null;
let deleteMode = false;

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

function renderTasks() {
    const tbody = document.querySelector("#tasksTable tbody");
    const headerRow = document.getElementById("tasksHeaderRow");

    tbody.innerHTML = "";
    headerRow.innerHTML = "";

    // Select All checkbox in header when in delete mode
    if (deleteMode && tasks.length > 0) {
        const thCheckbox = document.createElement("th");
        const label = document.createElement("label");
        label.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;";
        const selectAll = document.createElement("input");
        selectAll.type = "checkbox";
        selectAll.id = "selectAll";
        selectAll.addEventListener("change", () => {
            document.querySelectorAll(".taskCheckbox").forEach(cb => {
                cb.checked = selectAll.checked;
            });
        });
        label.appendChild(selectAll);
        label.appendChild(document.createTextNode("All"));
        thCheckbox.appendChild(label);
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
            // Prevent row click from toggling checkbox twice
            cb.addEventListener("click", e => e.stopPropagation());
            tdCheckbox.appendChild(cb);
            tr.appendChild(tdCheckbox);

            // Clicking the row toggles the checkbox in delete mode
            tr.addEventListener("click", () => {
                cb.checked = !cb.checked;
                // Sync select-all state
                const all = document.querySelectorAll(".taskCheckbox");
                const allChecked = [...all].every(c => c.checked);
                const selectAllCb = document.getElementById("selectAll");
                if (selectAllCb) selectAllCb.checked = allChecked;
            });
        } else {
            // Edit mode: clicking the row selects it for editing
            tr.style.cursor = "pointer";
            tr.addEventListener("click", () => {
                document.querySelectorAll("#tasksTable tbody tr").forEach(r => r.classList.remove("selected"));
                tr.classList.add("selected");
                editTask(index);
            });
        }

        ["text", "time", "date"].forEach(key => {
            const td = document.createElement("td");
            td.textContent = task[key];
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}

addTaskBtn.addEventListener("click", () => {
    // Block adding/updating while in delete mode
    if (deleteMode) return;

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
        .then(() => {
            loadTasks();
            clearInputs();
            addTaskBtn.textContent = "Add Task";
            editIndex = null;
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

deleteTaskBtn.addEventListener("click", () => {
    if (tasks.length === 0) return alert("No tasks to delete!");

    const checked = document.querySelectorAll(".taskCheckbox:checked");

    if (!deleteMode) {
        // Enter delete mode — also cancel any active edit
        deleteMode = true;
        editIndex = null;
        addTaskBtn.textContent = "Add Task";
        deleteTaskBtn.textContent = "Select to delete";
        deleteTaskBtn.style.backgroundColor = "#e63946";
        deleteTaskBtn.style.color = "#fff";
        clearInputs();
        renderTasks();
    } else {
        if (checked.length === 0) {
            // Exit delete mode if nothing checked
            deleteMode = false;
            deleteTaskBtn.textContent = "Delete";
            deleteTaskBtn.style.backgroundColor = "";
            deleteTaskBtn.style.color = "";
            renderTasks();
        } else {
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
                .then(() => {
                    deleteMode = false;
                    deleteTaskBtn.textContent = "Delete";
                    deleteTaskBtn.style.backgroundColor = "";
                    deleteTaskBtn.style.color = "";
                    loadTasks();
                })
                .catch(err => console.error("Delete error:", err));
            }
        }
    }
});

function editTask(index) {
    // Only allow editing when not in delete mode
    if (deleteMode) return;

    const task = tasks[index];
    taskInput.value = task.text;
    timeInput.value = task.time === "Not set" ? "" : task.time;
    dateInput.value = task.date === "Not set" ? "" : task.date;
    editIndex = index;
    addTaskBtn.textContent = "Update Task";
}

function clearInputs() {
    taskInput.value = "";
    timeInput.value = "";
    dateInput.value = "";
}

loadTasks();