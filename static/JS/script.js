const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const welcomeScreen = document.getElementById("welcome-screen");

// Sidebar Elements
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menu-btn");
const openMenuBtn = document.getElementById("open-menu-btn");

// Toggle Sidebar Logic
menuBtn.addEventListener("click", () => {
    sidebar.classList.add("collapsed");
    openMenuBtn.classList.remove("hidden"); // Show hamburger in header
});

openMenuBtn.addEventListener("click", () => {
    sidebar.classList.remove("collapsed");
    openMenuBtn.classList.add("hidden"); // Hide hamburger in header
});

// Chat Logic
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") sendMessage();
});

function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Hide welcome screen on first message
    if (welcomeScreen) {
        welcomeScreen.style.display = "none";
    }

    // Display user message
    appendMessage(message, "user");
    userInput.value = "";

    // Send message to backend
    fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
    })
    .then(response => response.json())
    .then(data => appendMessage(data.reply, "bot"))
    .catch(err => appendMessage("Error connecting to server.", "bot"));
}

function appendMessage(message, sender) {
    // Outer wrapper for alignment (left/right)
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("chat-message", sender);
    
    // Inner wrapper for the actual bubble and text
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("msg-content");
    
    if (sender === "bot") {
        contentDiv.innerHTML = marked.parse(message);
    } else {
        contentDiv.textContent = message;
    }
    
    msgDiv.appendChild(contentDiv);
    chatBox.appendChild(msgDiv);
    
    // Smooth scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
}