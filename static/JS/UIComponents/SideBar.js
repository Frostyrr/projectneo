class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById("sidebar");
        this.menuBtn = document.getElementById("menu-btn");
        this.openMenuBtn = document.getElementById("open-menu-btn");
        this.searchInput = document.getElementById("chat-search-input");
        this.init();
    }

    init() {
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

        this.initSearch(); // Initialize the search listener
    }

    // NEW: Handles filtering the recent chat list based on text input
    initSearch() {
        if (this.searchInput) {
            this.searchInput.addEventListener("input", (e) => {
                const searchTerm = e.target.value.toLowerCase();
                // Select all generated list items
                const chatItems = document.querySelectorAll(".recent-list li");

                chatItems.forEach((item) => {
                    // Extract the text only from the title span
                    const titleEl = item.querySelector(".chat-title-text");
                    if (titleEl) {
                        const titleText = titleEl.textContent.toLowerCase();
                        if (titleText.includes(searchTerm)) {
                            item.style.display = ""; // Show
                        } else {
                            item.style.display = "none"; // Hide
                        }
                    }
                });
            });
        }
    }

    collapseOnMobile() {
        if (window.innerWidth <= 768) {
            this.sidebar.classList.add("collapsed");
            this.openMenuBtn.classList.remove("hidden");
        }
    }
}