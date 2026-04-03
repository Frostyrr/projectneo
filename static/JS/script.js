const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const welcomeScreen = document.getElementById("welcome-screen");

// Sidebar Elements
const sidebar = document.getElementById("sidebar");
const menuBtn = document.getElementById("menu-btn");
const openMenuBtn = document.getElementById("open-menu-btn");

// for mobile view
if (window.innerWidth <= 768) {
    sidebar.classList.add("collapsed");
    openMenuBtn.classList.remove("hidden");
} else {
    sidebar.classList.remove("collapsed");
    openMenuBtn.classList.add("hidden");
}

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
    
    // --- NEW: Add Neo's Avatar for Bot Messages ---
    if (sender === "bot") {
        const avatarImg = document.createElement("img");
        avatarImg.src = "/static/images/singleNEO.png";
        avatarImg.alt = "Neo";
        avatarImg.classList.add("bot-avatar");
        msgDiv.appendChild(avatarImg);
    }
    
    // Wrapper for the content and actions
    const innerWrapper = document.createElement("div");
    innerWrapper.style.display = "flex";
    innerWrapper.style.flexDirection = "column";
    
    // Give the text room to breathe, accounting for the new avatar's width
    innerWrapper.style.maxWidth = sender === "bot" ? "calc(100% - 46px)" : "70%";
    
    if (sender === "user") {
         innerWrapper.style.alignItems = "flex-end";
    }

    // Inner wrapper for the actual bubble and text
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("msg-content");
    
    if (sender === "bot") {
        contentDiv.innerHTML = marked.parse(message);
        innerWrapper.appendChild(contentDiv);

        // --- Create Copy Button ---
        const actionsDiv = document.createElement("div");
        actionsDiv.classList.add("message-actions");

        const copyBtn = document.createElement("button");
        copyBtn.classList.add("copy-btn");
        copyBtn.innerHTML = '<span class="material-symbols-rounded">content_copy</span> Copy';
        
        // Add click event to copy text
        copyBtn.addEventListener("click", () => {
            navigator.clipboard.writeText(message).then(() => {
                copyBtn.innerHTML = '<span class="material-symbols-rounded">check</span> Copied!';
                copyBtn.style.color = "#81c995"; 
                
                setTimeout(() => {
                    copyBtn.innerHTML = '<span class="material-symbols-rounded">content_copy</span> Copy';
                    copyBtn.style.color = "#a0a0a0";
                }, 2000);
            }).catch(err => {
                console.error("Failed to copy text: ", err);
            });
        });

        actionsDiv.appendChild(copyBtn);
        innerWrapper.appendChild(actionsDiv);

    } else {
        contentDiv.textContent = message;
        innerWrapper.appendChild(contentDiv);
    }
    
    msgDiv.appendChild(innerWrapper);
    chatBox.appendChild(msgDiv);
    
    // Smooth scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
}