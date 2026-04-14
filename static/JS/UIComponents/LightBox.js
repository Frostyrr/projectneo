class LightboxManager {
    constructor(chatBox) {
        this.chatBox = chatBox;
        this.imageModal = document.getElementById("image-modal");
        this.modalImg = document.getElementById("modal-img");
        this.closeModalBtn = document.getElementById("close-modal");
        this.init();
    }

    init() {
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
}