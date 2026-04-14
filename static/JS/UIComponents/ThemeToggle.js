class ThemeToggleManager {
    constructor() {
        this.darkImg = document.getElementById("dark-img");
        this.lightImg = document.getElementById("light-img");
        this.init();
    }

    init() {
        const savedTheme = localStorage.getItem("neo-theme") || "dark";
        this.setTheme(savedTheme);

        this.darkImg.addEventListener("click", () => {
            this.setTheme("dark");
        });

        this.lightImg.addEventListener("click", () => {
            this.setTheme("light");
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("neo-theme", theme);

        // Highlight selected
        if (theme === "dark") {
            this.darkImg.classList.remove("inactive");
            this.lightImg.classList.add("inactive");
        } else {
            this.lightImg.classList.remove("inactive");
            this.darkImg.classList.add("inactive");
        }
    }
}