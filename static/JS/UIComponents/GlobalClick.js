class GlobalClickManager {
    constructor(userProfileBtn, userDropdownMenu) {
        this.userProfileBtn = userProfileBtn;
        this.userDropdownMenu = userDropdownMenu;
        this.init();
    }

    init() {
        document.addEventListener("click", (event) => {
            // Close profile dropdown
            if (
                this.userProfileBtn &&
                !this.userProfileBtn.contains(event.target) &&
                !this.userDropdownMenu.contains(event.target)
            ) {
                this.userDropdownMenu.classList.add("hidden");
            }

            // Close chat options menus
            document.querySelectorAll(".chat-options-menu").forEach(menu => {
                const btn = menu.previousElementSibling;
                if (btn && !btn.contains(event.target) && !menu.contains(event.target)) {
                    menu.classList.add("hidden");
                }
            });
        });

        if (this.userProfileBtn) {
            this.userProfileBtn.addEventListener("click", () => {
                this.userDropdownMenu.classList.toggle("hidden");
            });
        }
    }
}