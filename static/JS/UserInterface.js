// ================================================================================
// This file handles only DOM manipulation, animations, buttons, and HTML rendering
// ================================================================================

class UIManager {
    constructor() {
        // DOM Elements
        this.chatBox = document.getElementById("chat-box");
        this.welcomeScreen = document.getElementById("welcome-screen");
        this.sidebar = document.getElementById("sidebar");
        this.menuBtn = document.getElementById("menu-btn");
        this.openMenuBtn = document.getElementById("open-menu-btn");
        this.recentList = document.querySelector(".recent-list");
        this.userInput = document.getElementById("user-input");
        
        // Modal Elements
        this.imageModal = document.getElementById("image-modal");
        this.modalImg = document.getElementById("modal-img");
        this.closeModalBtn = document.getElementById("close-modal");

        this.initSidebar();
        this.initLightbox();
    }

    // --- Sidebar Logic ---
    initSidebar() {
        if (window.innerWidth <= 768) {
            this.sidebar.classList.add("collapsed");
            this.openMenuBtn.classList.remove("hidden");
        } else {
            this.sidebar.classList.remove("collapsed");
            this.openMenuBtn.classList.add("hidden");
        }

        this.menuBtn.addEventListener("click", () => {
            this.sidebar.classList.add("collapsed");
            this.openMenuBtn.classList.remove("hidden");
        });

        this.openMenuBtn.addEventListener("click", () => {
            this.sidebar.classList.remove("collapsed");
            this.openMenuBtn.classList.add("hidden");
        });
    }

    closeSidebarOnMobile() {
        if (window.innerWidth <= 768) {
            this.sidebar.classList.add("collapsed");
            this.openMenuBtn.classList.remove("hidden");
        }
    }

    // --- Lightbox Logic ---
    initLightbox() {
        this.chatBox.addEventListener("click", (event) => {
            if (event.target.tagName === "IMG" && !event.target.classList.contains("bot-avatar")) {
                this.imageModal.style.display = "flex";
                this.modalImg.src = event.target.src;
            }
        });

        this.closeModalBtn.addEventListener("click", () => {
            this.imageModal.style.display = "none";
        });

        this.imageModal.addEventListener("click", (event) => {
            if (event.target === this.imageModal) {
                this.imageModal.style.display = "none";
            }
        });
    }

    // --- Chat Rendering Logic ---
    clearChatBox() {
        if (this.welcomeScreen) this.welcomeScreen.style.display = "none";
    }

    showWelcomeScreen() {
        this.chatBox.innerHTML = ""; // Clear messages
        if (this.welcomeScreen) {
            this.welcomeScreen.style.display = "block";
            this.chatBox.appendChild(this.welcomeScreen);
        }
    }

    clearFullChat() {
        this.chatBox.innerHTML = "";
    }

    resetInputUI() {
        this.userInput.value = "";
        this.userInput.placeholder = "Ask Neo...";
        
        const previewContainer = document.getElementById("image-preview-container");
        if (previewContainer) previewContainer.style.display = "none";
        
        const imageBtn = document.getElementById("image-btn");
        if (imageBtn) imageBtn.style.color = ""; 
    }

    renderSidebarChats(chats, onLoadChat, onRenameChat, onDeleteChat) {
        this.recentList.innerHTML = ""; 

        chats.forEach(chat => {
            const li = document.createElement("li");
            li.style.display = "flex";
            li.style.alignItems = "center";
            li.style.justifyContent = "space-between";

            const a = document.createElement("a");
            a.href = "#";
            a.innerHTML = `<span class="material-symbols-rounded" style="font-size: 18px;">chat_bubble</span> <span class="chat-title-text">${chat.title}</span>`;
            a.style.flex = "1";
            a.style.overflow = "hidden";
            a.style.textOverflow = "ellipsis";
            a.style.whiteSpace = "nowrap";
            
            a.addEventListener("click", (e) => {
                e.preventDefault();
                onLoadChat(chat.chat_id);
            });

            // Container for the edit and delete buttons
            const btnContainer = document.createElement("div");
            btnContainer.style.display = "flex";
            btnContainer.style.gap = "4px";

            // Rename Button
            const renameBtn = document.createElement("button");
            renameBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 16px;">edit</span>`;
            renameBtn.style.background = "none";
            renameBtn.style.border = "none";
            renameBtn.style.color = "#a0a0a0";
            renameBtn.style.cursor = "pointer";
            renameBtn.style.padding = "5px";

            renameBtn.addEventListener("click", () => {
                const newTitle = prompt("Enter new chat name:", chat.title);
                if (newTitle && newTitle.trim() !== "") {
                    onRenameChat(chat.chat_id, newTitle.trim());
                }
            });

            // Delete Button
            const deleteBtn = document.createElement("button");
            deleteBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 16px;">delete</span>`;
            deleteBtn.style.background = "none";
            deleteBtn.style.border = "none";
            deleteBtn.style.color = "#ff4d4f"; 
            deleteBtn.style.cursor = "pointer";
            deleteBtn.style.padding = "5px";

            deleteBtn.addEventListener("click", () => {
                if (confirm(`Are you sure you want to delete "${chat.title}"?`)) {
                    onDeleteChat(chat.chat_id);
                }
            });

            btnContainer.appendChild(renameBtn);
            btnContainer.appendChild(deleteBtn);
            
            li.appendChild(a);
            li.appendChild(btnContainer);
            this.recentList.appendChild(li);
        });
    }

    appendMessage(message, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("chat-message", sender);
        
        if (sender === "bot") {
            const avatarImg = document.createElement("img");
            avatarImg.src = "/static/images/singleNEO.png";
            avatarImg.alt = "Neo";
            avatarImg.classList.add("bot-avatar");
            msgDiv.appendChild(avatarImg);
        }
        
        const innerWrapper = document.createElement("div");
        innerWrapper.style.display = "flex";
        innerWrapper.style.flexDirection = "column";
        innerWrapper.style.maxWidth = sender === "bot" ? "calc(100% - 46px)" : "70%";
        
        if (sender === "user") innerWrapper.style.alignItems = "flex-end";

        const contentDiv = document.createElement("div");
        contentDiv.classList.add("msg-content");
        
        if (sender === "bot") {
            contentDiv.innerHTML = marked.parse(message);
            innerWrapper.appendChild(contentDiv);

            const actionsDiv = document.createElement("div");
            actionsDiv.classList.add("message-actions");

            const copyBtn = document.createElement("button");
            copyBtn.classList.add("copy-btn");
            copyBtn.innerHTML = '<span class="material-symbols-rounded">content_copy</span> Copy';
            
            copyBtn.addEventListener("click", () => {
                navigator.clipboard.writeText(message).then(() => {
                    copyBtn.innerHTML = '<span class="material-symbols-rounded">check</span> Copied!';
                    copyBtn.style.color = "#81c995"; 
                    setTimeout(() => {
                        copyBtn.innerHTML = '<span class="material-symbols-rounded">content_copy</span> Copy';
                        copyBtn.style.color = "#a0a0a0";
                    }, 2000);
                }).catch(err => console.error("Failed to copy text: ", err));
            });

            actionsDiv.appendChild(copyBtn);
            innerWrapper.appendChild(actionsDiv);

        } else {
            contentDiv.innerHTML = message;
            innerWrapper.appendChild(contentDiv);
        }
        
        msgDiv.appendChild(innerWrapper);
        this.chatBox.appendChild(msgDiv);
        
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }
}