class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById("sidebar");
        this.menuBtn = document.getElementById("menu-btn");
        this.openMenuBtn = document.getElementById("open-menu-btn");
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
    }

    collapseOnMobile() {
        if (window.innerWidth <= 768) {
            this.sidebar.classList.add("collapsed");
            this.openMenuBtn.classList.remove("hidden");
        }
    }
}