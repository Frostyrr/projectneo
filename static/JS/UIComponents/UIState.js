class UIStateManager {
    constructor(chatBox, welcomeScreen, userInput) {
        this.chatBox = chatBox;
        this.welcomeScreen = welcomeScreen;
        this.userInput = userInput;
    }

    clearChatBox() {
        if (this.welcomeScreen) this.welcomeScreen.style.display = "none";
    }

    showWelcomeScreen() {
        this.chatBox.innerHTML = "";
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
        this.userInput.style.height = "44px";
        this.userInput.style.overflowY = "hidden";
        this.userInput.placeholder = "Ask Neo...";

        const previewContainer = document.getElementById("image-preview-container");
        if (previewContainer) previewContainer.style.display = "none";

        const imageBtn = document.getElementById("image-btn");
        if (imageBtn) imageBtn.style.color = "";
    }
}