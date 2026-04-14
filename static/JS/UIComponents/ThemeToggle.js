class ThemeToggleManager {
    constructor() {
        this.themeToggle = document.getElementById("theme-toggle");
        this.init();
    }

    init() {
        const savedTheme = localStorage.getItem("neo-theme") || "dark";
        this.setTheme(savedTheme);

        if (this.themeToggle) {
            this.themeToggle.addEventListener("change", (e) => {
                const newTheme = e.target.checked ? "light" : "dark";
                this.setTheme(newTheme);
            });
        }
    }

    setTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem("neo-theme", theme);
        if (this.themeToggle) {
            this.themeToggle.checked = theme === "light";
        }
    }
}