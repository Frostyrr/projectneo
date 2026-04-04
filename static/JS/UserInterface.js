// ================================================================================
// This file handles only DOM manipulation, animations, buttons, and HTML rendering
// ================================================================================

// static/JS/ui.js

class UIManager {
    constructor() {
        // DOM Elements - Chat Area
        this.chatBox = document.getElementById("chat-box");
        this.welcomeScreen = document.getElementById("welcome-screen");
        this.userInput = document.getElementById("user-input");
        
        // DOM Elements - Sidebar
        this.sidebar = document.getElementById("sidebar");
        this.menuBtn = document.getElementById("menu-btn");
        this.openMenuBtn = document.getElementById("open-menu-btn");
        this.recentList = document.querySelector(".recent-list");
        
        // DOM Elements - Profile Dropdown
        this.userProfileBtn = document.getElementById("user-profile-btn");
        this.userDropdownMenu = document.getElementById("user-dropdown-menu");

        // DOM Elements - Lightbox Modal
        this.imageModal = document.getElementById("image-modal");
        this.modalImg = document.getElementById("modal-img");
        this.closeModalBtn = document.getElementById("close-modal");

        // Initialize UI Listeners
        this.initSidebar();
        this.initLightbox();
        this.initGlobalClick(); 
    }

    // --- Global Click Listener (Closes open menus) ---
    initGlobalClick() {
        document.addEventListener('click', (event) => {
            // Close User Profile Menu
            if (this.userProfileBtn && !this.userProfileBtn.contains(event.target) && !this.userDropdownMenu.contains(event.target)) {
                this.userDropdownMenu.classList.add("hidden");
            }
            
            // Close Chat Options Menus (Three dots)
            document.querySelectorAll('.chat-options-menu').forEach(menu => {
                const btn = menu.previousElementSibling;
                if (btn && !btn.contains(event.target) && !menu.contains(event.target)) {
                    menu.classList.add("hidden");
                }
            });
        });

        // Toggle user profile menu
        if (this.userProfileBtn) {
            this.userProfileBtn.addEventListener('click', () => {
                this.userDropdownMenu.classList.toggle("hidden");
            });
        }
    }

    // --- Sidebar Toggle Logic ---
    initSidebar() {
        // Auto-collapse on mobile screens
        if (window.innerWidth <= 768) {
            this.sidebar.classList.add("collapsed");
            this.openMenuBtn.classList.remove("hidden");
        } else {
            this.sidebar.classList.remove("collapsed");
            this.openMenuBtn.classList.add("hidden");
        }

        // Collapse Button (inside sidebar)
        this.menuBtn.addEventListener("click", () => {
            this.sidebar.classList.add("collapsed");
            this.openMenuBtn.classList.remove("hidden");
        });

        // Hamburger Button (top left)
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

    // --- Lightbox (Image Viewing) Logic ---
    initLightbox() {
        // Open modal when an image in the chat is clicked
        this.chatBox.addEventListener("click", (event) => {
            if (event.target.tagName === "IMG" && !event.target.classList.contains("bot-avatar")) {
                this.imageModal.style.display = "flex";
                this.modalImg.src = event.target.src;
            }
        });

        // Close via X button
        this.closeModalBtn.addEventListener("click", () => {
            this.imageModal.style.display = "none";
        });

        // Close by clicking the dark background
        this.imageModal.addEventListener("click", (event) => {
            if (event.target === this.imageModal) {
                this.imageModal.style.display = "none";
            }
        });
    }

    // --- UI State Helpers ---
    clearChatBox() {
        if (this.welcomeScreen) this.welcomeScreen.style.display = "none";
    }

    showWelcomeScreen() {
        this.chatBox.innerHTML = ""; // Clear active messages
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

    // --- Render Sidebar Chat List ---
    renderSidebarChats(chats, onLoadChat, onRenameChat, onDeleteChat, onPinChat) {
        this.recentList.innerHTML = ""; // Clear current list

        chats.forEach(chat => {
            const li = document.createElement("li");

            // 1. Create the Chat Link
            const a = document.createElement("a");
            a.href = "#";
            a.className = "chat-link";
            
            // Switch icon if pinned
            const icon = chat.is_pinned ? "push_pin" : "chat_bubble";
            a.innerHTML = `<span class="material-symbols-rounded" style="font-size: 18px;">${icon}</span> <span class="chat-title-text">${chat.title}</span>`;
            
            a.addEventListener("click", (e) => {
                e.preventDefault();
                onLoadChat(chat.chat_id);
            });

            // 2. Create the Three-Dots Options Button
            const optionsBtn = document.createElement("button");
            optionsBtn.className = "chat-options-btn";
            optionsBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 18px;">more_horiz</span>`;

            // 3. Create the Floating Dropdown Menu
            const optionsMenu = document.createElement("div");
            optionsMenu.className = "floating-dropdown chat-options-menu hidden";
            optionsMenu.style.top = "30px";
            optionsMenu.style.right = "-10px"; 

            optionsMenu.innerHTML = `
                <button class="dropdown-item pin-btn">
                    <span class="material-symbols-rounded">${chat.is_pinned ? 'push_pin' : 'keep'}</span> 
                    ${chat.is_pinned ? 'Unpin' : 'Pin'}
                </button>
                <button class="dropdown-item rename-btn">
                    <span class="material-symbols-rounded">edit</span> Rename
                </button>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item danger-text delete-btn">
                    <span class="material-symbols-rounded">delete</span> Delete
                </button>
            `;

            // 4. Bind Dropdown Logic
            optionsBtn.addEventListener("click", (e) => {
                e.stopPropagation(); // Stop chat from loading when clicking dots
                // Hide other open menus first
                document.querySelectorAll('.chat-options-menu').forEach(m => m.classList.add("hidden"));
                optionsMenu.classList.remove("hidden"); // Show this one
            });

            optionsMenu.querySelector('.pin-btn').addEventListener("click", () => {
                onPinChat(chat.chat_id, !chat.is_pinned);
            });

            optionsMenu.querySelector('.rename-btn').addEventListener("click", () => {
                optionsMenu.classList.add("hidden");
                const newTitle = prompt("Enter new chat name:", chat.title);
                if (newTitle && newTitle.trim() !== "") onRenameChat(chat.chat_id, newTitle.trim());
            });

            optionsMenu.querySelector('.delete-btn').addEventListener("click", () => {
                optionsMenu.classList.add("hidden");
                if (confirm(`Are you sure you want to delete "${chat.title}"?`)) {
                    onDeleteChat(chat.chat_id);
                }
            });

            // 5. Append to List
            li.appendChild(a);
            li.appendChild(optionsBtn);
            li.appendChild(optionsMenu);
            this.recentList.appendChild(li);
        });
    }

    // --- Render Chat Messages ---
    appendMessage(message, sender) {
        const msgDiv = document.createElement("div");
        msgDiv.classList.add("chat-message", sender);
        
        // Add Neo Avatar if it's the bot
        if (sender === "bot") {
            const avatarImg = document.createElement("img");
            avatarImg.src = "/static/images/singleNEO.png";
            avatarImg.alt = "Neo";
            avatarImg.classList.add("bot-avatar");
            msgDiv.appendChild(avatarImg);
        }
        
        // Message Wrapper
        const innerWrapper = document.createElement("div");
        innerWrapper.style.display = "flex";
        innerWrapper.style.flexDirection = "column";
        // Compensate width for the avatar icon
        innerWrapper.style.maxWidth = sender === "bot" ? "calc(100% - 46px)" : "70%";
        
        if (sender === "user") innerWrapper.style.alignItems = "flex-end";

        // Text Content
        const contentDiv = document.createElement("div");
        contentDiv.classList.add("msg-content");
        
        if (sender === "bot") {
            contentDiv.innerHTML = marked.parse(message); // Parse markdown
            innerWrapper.appendChild(contentDiv);

            // Add "Copy" Button to Bot messages
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
            contentDiv.innerHTML = message; // User messages are raw text/HTML (images)
            innerWrapper.appendChild(contentDiv);
        }
        
        msgDiv.appendChild(innerWrapper);
        this.chatBox.appendChild(msgDiv);
        
        // Auto-scroll to bottom
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }
}