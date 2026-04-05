const classInput = document.getElementById("classInput");
const dayInput = document.getElementById("dayInput");
const locationInput = document.getElementById("locationInput");
const startSelect = document.getElementById("startTimeInput");
const endSelect = document.getElementById("endTimeInput");

const addClassBtn = document.getElementById("addClassBtn");
const deleteClassBtn = document.getElementById("deleteClassBtn");

const scheduleTableBody = document.querySelector("#scheduleTable tbody");
const scheduleHeaderRow = document.getElementById("scheduleHeaderRow");

let schedule = JSON.parse(localStorage.getItem("schedule")) || [];
let editIndex = null;
let deleteMode = false;

// Populate Start/End Time
function populateTimeDropdown(selectElement, startHour = 7, endHour = 21) {
    for (let hour = startHour; hour <= endHour; hour++) {
        for (let min of [0,30]) {
            let ampm = hour < 12 ? "AM" : "PM";
            let displayHour = hour % 12 === 0 ? 12 : hour % 12;
            let displayMin = min === 0 ? "00" : "30";
            let timeStr = `${displayHour}:${displayMin}${ampm}`;
            const option = document.createElement("option");
            option.value = timeStr;
            option.textContent = timeStr;
            selectElement.appendChild(option);
        }
    }
}

populateTimeDropdown(startSelect);
populateTimeDropdown(endSelect);

<<<<<<< HEAD
function renderSchedule() {
    scheduleTableBody.innerHTML = "";
    
=======
// Render Schedule
function renderSchedule() {
    scheduleTableBody.innerHTML = "";
    
    // Header
>>>>>>> 3ee73af52ffa456ff5d9f64efa90ef77f55b398b
    scheduleHeaderRow.innerHTML = "";
    if(deleteMode && schedule.length>0){
        const thCheck = document.createElement("th");
        scheduleHeaderRow.appendChild(thCheck);
    }
    ["Class", "Time", "Day", "Location"].forEach(txt=>{
        const th = document.createElement("th");
        th.textContent = txt;
        scheduleHeaderRow.appendChild(th);
    });

    schedule.forEach((cls,index)=>{
        const tr = document.createElement("tr");

        if(deleteMode){
            const tdCheck = document.createElement("td");
            const cb = document.createElement("input");
            cb.type="checkbox";
            cb.classList.add("taskCheckbox");
            cb.dataset.index=index;
            tdCheck.appendChild(cb);
            tr.appendChild(tdCheck);
        }

        ["className","time","day","location"].forEach(key=>{
            const td = document.createElement("td");
            td.textContent = cls[key];
            tr.appendChild(td);
        });

        tr.addEventListener("click",(e)=>{
            if(deleteMode || e.target.type==="checkbox") return;
            editClass(index);
            document.querySelectorAll("#scheduleTable tbody tr").forEach(r=>r.classList.remove("selected"));
            tr.classList.add("selected");
        });

        scheduleTableBody.appendChild(tr);
    });
}

<<<<<<< HEAD
=======
// Add / Update Class
>>>>>>> 3ee73af52ffa456ff5d9f64efa90ef77f55b398b
addClassBtn.addEventListener("click",()=>{
    const cls = classInput.value.trim();
    const day = dayInput.value;
    const start = startSelect.value;
    const end = endSelect.value;
    const location = locationInput.value.trim();

    if(!cls || !day || !start || !end || !location) return alert("Please fill all fields");

    const time = `${start} - ${end}`;

    if(editIndex!==null){
        schedule[editIndex] = {className:cls,time,day,location};
        editIndex=null;
        addClassBtn.textContent="Add";
    } else {
        schedule.push({className:cls,time,day,location});
    }

    localStorage.setItem("schedule",JSON.stringify(schedule));
    clearInputs();
    deleteMode=false;
    renderSchedule();
});

// Delete Mode / Delete Selected
deleteClassBtn.addEventListener("click",()=>{
    if(schedule.length===0) return alert("No classes to delete!");
    const checked = document.querySelectorAll(".taskCheckbox:checked");

    if(!deleteMode){
        deleteMode=true;
        renderSchedule();
    } else {
        if(checked.length===0){
            deleteMode=false;
            renderSchedule();
        } else {
            if(confirm("Delete selected classes?")){
                const indexes = Array.from(checked).map(cb=>parseInt(cb.dataset.index));
                indexes.sort((a,b)=>b-a).forEach(i=>schedule.splice(i,1));
                localStorage.setItem("schedule",JSON.stringify(schedule));
                deleteMode=false;
                renderSchedule();
            }
        }
    }
});

// Edit class
function editClass(index){
    const cls = schedule[index];
    classInput.value = cls.className;
    dayInput.value = cls.day;
    startSelect.value = cls.time.split(" - ")[0];
    endSelect.value = cls.time.split(" - ")[1];
    locationInput.value = cls.location;
    editIndex=index;
    addClassBtn.textContent="Update Class";
}

// Clear inputs
function clearInputs(){
    classInput.value="";
    dayInput.value="";
    startSelect.value="";
    endSelect.value="";
    locationInput.value="";
}

// Initial render
renderSchedule();