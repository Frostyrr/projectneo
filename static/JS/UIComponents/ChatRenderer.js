class ChatRenderer {
    constructor(chatBox, recentList) {
        this.chatBox = chatBox;
        this.recentList = recentList;
    }

    appendMessage(message, sender, animate = false) {
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

            // --- ChatGPT Typewriter Animation Logic ---
            if (animate) {
                let index = 0;
                innerWrapper.appendChild(contentDiv);
                msgDiv.appendChild(innerWrapper);
                this.chatBox.appendChild(msgDiv);
                
                // Simulate variable typing speed/token streaming
                const typeWriter = () => {
                    if (index < message.length) {
                        // Reveal chunks of 2-5 characters for a fast, natural streaming feel
                        const chunkSize = Math.floor(Math.random() * 4) + 2; 
                        index += chunkSize;
                        if (index > message.length) index = message.length;

                        const currentText = message.substring(0, index);
                        
                        // Parse current markdown and append the blinking cursor
                        contentDiv.innerHTML = marked.parse(currentText) + '<span class="gpt-cursor"></span>';
                        
                        // Auto-scroll while typing
                        this.chatBox.scrollTop = this.chatBox.scrollHeight;
                        
                        // 15ms delay feels very similar to OpenAI's token stream
                        setTimeout(typeWriter, 15);
                    } else {
                        // Typing finished: Remove cursor, render final pristine Markdown, show copy button
                        contentDiv.innerHTML = marked.parse(message);
                        innerWrapper.appendChild(actionsDiv);
                        this.chatBox.scrollTop = this.chatBox.scrollHeight;
                    }
                };
                
                typeWriter(); // Start animation
                return; // Exit early since we already appended msgDiv
            } else {
                // No animation (e.g., loading chat history)
                contentDiv.innerHTML = marked.parse(message);
                innerWrapper.appendChild(contentDiv);
                innerWrapper.appendChild(actionsDiv);
            }
        } else {
            contentDiv.innerHTML = message;
            innerWrapper.appendChild(contentDiv);
        }

        msgDiv.appendChild(innerWrapper);
        this.chatBox.appendChild(msgDiv);
        this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }

    renderSidebarChats(chats, onLoadChat, onRenameChat, onDeleteChat, onPinChat) {
        this.recentList.innerHTML = "";

        chats.forEach(chat => {
            const li = document.createElement("li");

            const a = document.createElement("a");
            a.href = "#";
            a.className = "chat-link";
            const icon = chat.is_pinned ? "push_pin" : "chat_bubble";
            a.innerHTML = `<span class="material-symbols-rounded" style="font-size: 18px;">${icon}</span> <span class="chat-title-text">${chat.title}</span>`;
            a.addEventListener("click", (e) => {
                e.preventDefault();
                onLoadChat(chat.chat_id);
            });

            const optionsBtn = document.createElement("button");
            optionsBtn.className = "chat-options-btn";
            optionsBtn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 18px;">more_horiz</span>`;

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

            optionsBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                document.querySelectorAll(".chat-options-menu").forEach(m => m.classList.add("hidden"));
                optionsMenu.classList.remove("hidden");
            });

            optionsMenu.querySelector(".pin-btn").addEventListener("click", () => {
                onPinChat(chat.chat_id, !chat.is_pinned);
            });

            optionsMenu.querySelector(".rename-btn").addEventListener("click", () => {
                optionsMenu.classList.add("hidden");
                this._openRenameModal(chat, onRenameChat);
            });

            optionsMenu.querySelector(".delete-btn").addEventListener("click", () => {
                optionsMenu.classList.add("hidden");
                this._openDeleteModal(chat, onDeleteChat);
            });

            li.appendChild(a);
            li.appendChild(optionsBtn);
            li.appendChild(optionsMenu);
            this.recentList.appendChild(li);
        });
    }

    _openRenameModal(chat, onRenameChat) {
        const renameModal = document.getElementById("rename-chat-modal");
        const renameInput = document.getElementById("rename-chat-input");
        let confirmBtn = document.getElementById("confirm-rename-btn");
        let cancelBtn = document.getElementById("cancel-rename-btn");

        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        confirmBtn = newConfirmBtn;

        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        cancelBtn = newCancelBtn;

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
    }

    _openDeleteModal(chat, onDeleteChat) {
        const deleteModal = document.getElementById("delete-chat-modal");
        const chatNameEl = document.getElementById("delete-chat-name");
        let confirmBtn = document.getElementById("confirm-delete-chat-btn");
        let cancelBtn = document.getElementById("cancel-delete-chat-btn");

        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        confirmBtn = newConfirmBtn;

        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        cancelBtn = newCancelBtn;

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
    }
}