// ================================================================================
// This file handles only DOM manipulation, animations, buttons, and HTML rendering
// ================================================================================

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
        this.initSettingsModal();
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

    initSettingsModal() {
        this.settingsModal = document.getElementById("settings-modal-overlay");
        const btnSidebar = document.getElementById("open-settings-btn-sidebar");
        const btnHeader = document.getElementById("open-settings-btn-header");
        const btnClose = document.getElementById("close-settings-btn");
        const navItems = document.querySelectorAll(".settings-nav-item");
        const sections = document.querySelectorAll(".settings-section");

        // 1. Open Settings Logic
        const openSettings = () => {
            // Close dropdown if it's open
            if (this.userDropdownMenu) this.userDropdownMenu.classList.add("hidden");
            
            this.settingsModal.classList.remove("hidden");
            // Small timeout allows the CSS transition to trigger smoothly
            setTimeout(() => this.settingsModal.classList.add("visible"), 10); 
        };

        if (btnSidebar) btnSidebar.addEventListener("click", openSettings);
        if (btnHeader) btnHeader.addEventListener("click", openSettings);

        // 2. Close Settings Logic
        const closeSettings = () => {
            this.settingsModal.classList.remove("visible");
            setTimeout(() => this.settingsModal.classList.add("hidden"), 300);
        };

        if (btnClose) btnClose.addEventListener("click", closeSettings);

        // Allow pressing "Escape" key to close settings (Discord feature)
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.settingsModal.classList.contains("visible")) {
                closeSettings();
            }
        });

        // 3. Tab Switching Logic
        navItems.forEach(item => {
            item.addEventListener("click", () => {
                // Remove active states from all tabs
                navItems.forEach(nav => nav.classList.remove("active"));
                
                // Hide all content sections
                sections.forEach(sec => sec.classList.add("hidden"));

                // Add active state to clicked tab
                item.classList.add("active");
                
                // Show matching section based on data-target attribute
                const targetId = item.getAttribute("data-target");
                document.getElementById(targetId).classList.remove("hidden");
            });
        });

        // --- 4. User Settings Update & OTP Logic ---
        const settingsForm = document.getElementById("settings-update-form");
        const otpSection = document.getElementById("settings-otp-section");
        const otpForm = document.getElementById("settings-otp-form");
        const cancelOtpBtn = document.getElementById("cancel-otp-btn");

        if (settingsForm) {
            settingsForm.addEventListener("submit", async (e) => {
                e.preventDefault(); 
                
                const msgDiv = document.getElementById("settings-message");
                const saveBtn = document.getElementById("settings-save-btn");
                
                msgDiv.textContent = "Updating...";
                msgDiv.style.color = "#a0a0a0";
                saveBtn.disabled = true;

                const email = document.getElementById("settings-email").value;
                const current_password = document.getElementById("settings-current-password").value;
                const new_password = document.getElementById("settings-new-password").value;
                const confirm_password = document.getElementById("settings-confirm-password").value;

                try {
                    const response = await fetch("/api/user/settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, current_password, new_password, confirm_password })
                    });
                    
                    const data = await response.json();
                    saveBtn.disabled = false;
                    
                    if (response.ok) {
                        msgDiv.textContent = data.message || "Settings updated.";
                        msgDiv.style.color = "#4ade96"; 
                        
                        // Clear password fields
                        document.getElementById("settings-current-password").value = "";
                        document.getElementById("settings-new-password").value = "";
                        document.getElementById("settings-confirm-password").value = "";

                        // If email changed, backend tells us to show OTP field
                        if (data.require_otp) {
                            settingsForm.classList.add("hidden");
                            otpSection.classList.remove("hidden");
                            document.getElementById("otp-instruction-text").textContent = `Enter the 6-digit code sent to ${data.pending_email}`;
                        }
                    } else {
                        msgDiv.textContent = data.error;
                        msgDiv.style.color = "#ff6b6d"; 
                    }
                } catch (err) {
                    msgDiv.textContent = "A network error occurred.";
                    msgDiv.style.color = "#ff6b6d";
                    saveBtn.disabled = false;
                }
            });
        }

        if (otpForm) {
            otpForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                
                const otpMsg = document.getElementById("otp-message");
                const verifyBtn = document.getElementById("verify-otp-btn");
                const otp = document.getElementById("settings-otp-input").value;

                otpMsg.textContent = "Verifying...";
                otpMsg.style.color = "#a0a0a0";
                verifyBtn.disabled = true;

                try {
                    const response = await fetch("/api/user/verify-email-change", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ otp })
                    });
                    
                    const data = await response.json();
                    verifyBtn.disabled = false;

                    if (response.ok) {
                        // Success! Return to main form
                        document.getElementById("settings-otp-input").value = "";
                        otpSection.classList.add("hidden");
                        settingsForm.classList.remove("hidden");
                        
                        const mainMsg = document.getElementById("settings-message");
                        mainMsg.textContent = "Email updated successfully!";
                        mainMsg.style.color = "#4ade96";
                    } else {
                        otpMsg.textContent = data.error;
                        otpMsg.style.color = "#ff6b6d";
                    }
                } catch (err) {
                    otpMsg.textContent = "A network error occurred.";
                    otpMsg.style.color = "#ff6b6d";
                    verifyBtn.disabled = false;
                }
            });
        }

        if (cancelOtpBtn) {
            cancelOtpBtn.addEventListener("click", () => {
                otpSection.classList.add("hidden");
                settingsForm.classList.remove("hidden");
                document.getElementById("settings-message").textContent = "Email change cancelled.";
                document.getElementById("settings-message").style.color = "#a0a0a0";
            });
        }
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
        this.userInput.style.height = "44px";      // Shrink back to default height
        this.userInput.style.overflowY = "hidden"; // Hide scrollbar again
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

            // Rename logic
            optionsMenu.querySelector('.rename-btn').addEventListener("click", () => {
                optionsMenu.classList.add("hidden");
                
                const renameModal = document.getElementById("rename-chat-modal");
                const renameInput = document.getElementById("rename-chat-input");
                let confirmBtn = document.getElementById("confirm-rename-btn");
                let cancelBtn = document.getElementById("cancel-rename-btn");

                // Clone buttons to strip out old event listeners (prevents multi-firing on different chats)
                const newConfirmBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                confirmBtn = newConfirmBtn;

                const newCancelBtn = cancelBtn.cloneNode(true);
                cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
                cancelBtn = newCancelBtn;

                // Setup UI
                renameInput.value = chat.title;
                renameModal.classList.remove("hidden");
                setTimeout(() => renameModal.classList.add("visible"), 10);
                renameInput.focus();

                confirmBtn.addEventListener("click", () => {
                    const newTitle = renameInput.value.trim();
                    if (newTitle) onRenameChat(chat.chat_id, newTitle);
                    renameModal.classList.remove("visible");
                    setTimeout(() => renameModal.classList.add("hidden"), 300);
                });

                cancelBtn.addEventListener("click", () => {
                    renameModal.classList.remove("visible");
                    setTimeout(() => renameModal.classList.add("hidden"), 300);
                });
            });

            // Delete logic
            optionsMenu.querySelector('.delete-btn').addEventListener("click", () => {
                optionsMenu.classList.add("hidden");
                
                const deleteModal = document.getElementById("delete-chat-modal");
                const chatNameEl = document.getElementById("delete-chat-name");
                let confirmBtn = document.getElementById("confirm-delete-chat-btn");
                let cancelBtn = document.getElementById("cancel-delete-chat-btn");

                // Clone buttons to strip out old event listeners
                const newConfirmBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                confirmBtn = newConfirmBtn;

                const newCancelBtn = cancelBtn.cloneNode(true);
                cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
                cancelBtn = newCancelBtn;

                // Setup UI
                chatNameEl.textContent = chat.title;
                deleteModal.classList.remove("hidden");
                setTimeout(() => deleteModal.classList.add("visible"), 10);

                confirmBtn.addEventListener("click", () => {
                    onDeleteChat(chat.chat_id);
                    deleteModal.classList.remove("visible");
                    setTimeout(() => deleteModal.classList.add("hidden"), 300);
                });

                cancelBtn.addEventListener("click", () => {
                    deleteModal.classList.remove("visible");
                    setTimeout(() => deleteModal.classList.add("hidden"), 300);
                });
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