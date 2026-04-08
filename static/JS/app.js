// =========================================================================
// This is the main controller.
// It uses UIManager to update the screen and uses ApiService to fetch data.
// =========================================================================

class NeoApp {
    constructor() {
        // Initialize UI Manager
        this.ui = new UIManager();
        this.currentChatId = null;

        // Interactive Elements
        this.sendBtn = document.getElementById("send-btn");
        this.newChatBtn = document.getElementById("new-chat-btn");

        this.bindEvents();
        this.loadSidebar();
    }

    bindEvents() {
        // Sending Messages
        this.sendBtn.addEventListener("click", () => this.handleSendMessage());
        
        // UPDATE: Check for Shift key and prevent default enter behavior
        this.ui.userInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // Prevents adding a new line
                this.handleSendMessage();
            }
        });

        this.ui.userInput.addEventListener("input", function() {
            // Reset height first to recalculate shrinking if user deletes text
            this.style.height = "44px"; 
            this.style.height = this.scrollHeight + "px";
            
            // Show scrollbar ONLY if we hit the max height limit (e.g., 200px)
            if (this.scrollHeight >= 200) {
                this.style.overflowY = "auto";
            } else {
                this.style.overflowY = "hidden";
            }
        });

        // Auto-resize textarea
        this.ui.userInput.addEventListener("input", function () {
            this.style.height = "auto";
            this.style.height = this.scrollHeight + "px";
        });

        // New Chat Button
        this.newChatBtn.addEventListener("click", () => {
            this.currentChatId = null;
            this.ui.showWelcomeScreen();
            this.ui.closeSidebarOnMobile();
        });
    }

    async loadSidebar() {
        try {
            const chats = await ApiService.getChats();
            this.ui.renderSidebarChats(
                chats, 
                (chatId) => this.loadSpecificChat(chatId), 
                (chatId, newTitle) => this.renameSpecificChat(chatId, newTitle),
                (chatId) => this.deleteSpecificChat(chatId),
                (chatId, isPinned) => this.togglePinChat(chatId, isPinned) // NEW: Pass the Pin function
            );
        } catch (error) {
            console.error("Failed to load sidebar chats:", error);
        }
    }

    // NEW: Handle Pinning
    async togglePinChat(chatId, isPinned) {
        try {
            await ApiService.togglePinChat(chatId, isPinned);
            this.loadSidebar(); // Refresh the sidebar to instantly re-sort the list
        } catch (error) {
            console.error("Failed to pin chat:", error);
        }
    }

    // NEW: Handle the deletion process
    async deleteSpecificChat(chatId) {
        try {
            await ApiService.deleteChat(chatId);
            
            // If the user deleted the chat they are currently looking at, clear the screen
            if (this.currentChatId === chatId) {
                this.currentChatId = null;
                this.ui.showWelcomeScreen();
            }
            
            this.loadSidebar(); // Refresh the list to remove the deleted item
        } catch (error) {
            console.error("Failed to delete chat:", error);
        }
    }

    async loadSpecificChat(chatId) {
        this.currentChatId = chatId;
        this.ui.closeSidebarOnMobile();
        this.ui.clearFullChat();
        
        try {
            const messages = await ApiService.getChatHistory(chatId);
            
            messages.forEach(msg => {
                if (msg.role !== "system") { // Skip system prompts
                    this.ui.appendMessage(msg.content, msg.role === "assistant" ? "bot" : "user");
                }
            });
        } catch (error) {
            console.error("Failed to load chat history:", error);
            this.ui.appendMessage("❌ Error loading chat history.", "bot");
        }
    }

    async renameSpecificChat(chatId, newTitle) {
        try {
            await ApiService.renameChat(chatId, newTitle);
            this.loadSidebar(); // Refresh the list
        } catch (error) {
            console.error("Failed to rename chat:", error);
        }
    }

    async handleSendMessage() {
        const message = this.ui.userInput.value.trim();
        const imageFile = window.attachedImageFile; // Comes from ImageUpload.js

        if (!message && !imageFile) return;

        this.ui.clearChatBox();

        // 1. Render User Message Immediately
        if (imageFile) {
            const chatImageUrl = URL.createObjectURL(imageFile);
            const imageHtml = `<img src="${chatImageUrl}" style="max-width: 200px; border-radius: 8px; margin-bottom: 5px; display: block; cursor: pointer;" class="chat-image">`;
            this.ui.appendMessage(`${imageHtml}${message}`, "user");
        } else {
            this.ui.appendMessage(message, "user");
        }

        // Reset UI State
        this.ui.resetInputUI();
        window.attachedImageFile = null;

        // 2. Fetch API Response
        try {
            const isNewChat = (this.currentChatId === null);
            let responseData;

            if (imageFile) {
                responseData = await ApiService.sendImageMessage(message, this.currentChatId, imageFile);
            } else {
                responseData = await ApiService.sendTextMessage(message, this.currentChatId);
            }

            // Save session ID if provided by the backend
            if (responseData.chat_id) {
                this.currentChatId = responseData.chat_id;
                
                // If it's a new chat, reload the sidebar to show the auto-generated title
                if (isNewChat) this.loadSidebar(); 
            }

            // Render Bot Response
            if (responseData.reply) {
                this.ui.appendMessage(responseData.reply, "bot");
            } else if (responseData.error) {
                this.ui.appendMessage(`❌ Analysis Failed: ${responseData.error}`, "bot");
            }

        } catch (error) {
            console.error("Send Message Error:", error);
            this.ui.appendMessage(`❌ Critical Error: ${error.message}`, "bot");
        }
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    window.neoApp = new NeoApp();
});