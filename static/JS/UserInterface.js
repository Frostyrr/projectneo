class UIManager {
    constructor() {
        // Core DOM references
        this.chatBox = document.getElementById("chat-box");
        this.welcomeScreen = document.getElementById("welcome-screen");
        this.userInput = document.getElementById("user-input");
        this.recentList = document.querySelector(".recent-list");
        this.userProfileBtn = document.getElementById("user-profile-btn");
        this.userDropdownMenu = document.getElementById("user-dropdown-menu");

        // Initialize all components
        this.sidebar = new SidebarManager();
        this.lightbox = new LightboxManager(this.chatBox);
        this.theme = new ThemeToggleManager();
        this.settings = new SettingsModalManager(this.userDropdownMenu);
        this.globalClick = new GlobalClickManager(this.userProfileBtn, this.userDropdownMenu);
        this.renderer = new ChatRenderer(this.chatBox, this.recentList);
        this.state = new UIStateManager(this.chatBox, this.welcomeScreen, this.userInput);
    }

    // Proxy methods so app.js doesn't need to change
    closeSidebarOnMobile() {
        this.sidebar.collapseOnMobile(); 
    }

    clearChatBox() {
        this.state.clearChatBox(); 
    }

    showWelcomeScreen() { 
        this.state.showWelcomeScreen(); 
    }

    clearFullChat() {
        this.state.clearFullChat(); 
    }
    
    resetInputUI() { 
        this.state.resetInputUI(); 
    }

    appendMessage(message, sender) {
        this.renderer.appendMessage(message, sender);
    }

    renderSidebarChats(chats, ...callbacks) {
        this.renderer.renderSidebarChats(chats, ...callbacks); 
    }
}