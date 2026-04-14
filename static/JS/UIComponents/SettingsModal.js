class SettingsModalManager {
    constructor(userDropdownMenu) {
        this.settingsModal = document.getElementById("settings-modal-overlay");
        this.userDropdownMenu = userDropdownMenu;
        this.init();
    }

    init() {
        this.initOpenClose();
        this.initTabSwitching();
        this.initAccountForm();
        this.initOtpForm();
        this.initEmailEdit();
    }

    openSettings() {
        if (this.userDropdownMenu) this.userDropdownMenu.classList.add("hidden");
        this.settingsModal.classList.remove("hidden");
        setTimeout(() => this.settingsModal.classList.add("visible"), 10);
    }

    closeSettings() {
        this.settingsModal.classList.remove("visible");
        setTimeout(() => this.settingsModal.classList.add("hidden"), 300);
    }

    initOpenClose() {
        const btnSidebar = document.getElementById("open-settings-btn-sidebar");
        const btnHeader = document.getElementById("open-settings-btn-header");
        const btnClose = document.getElementById("close-settings-btn");

        if (btnSidebar) btnSidebar.addEventListener("click", () => this.openSettings());
        if (btnHeader) btnHeader.addEventListener("click", () => this.openSettings());
        if (btnClose) btnClose.addEventListener("click", () => this.closeSettings());

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.settingsModal.classList.contains("visible")) {
                this.closeSettings();
            }
        });
    }

    initTabSwitching() {
        const navItems = document.querySelectorAll(".settings-nav-item");
        const sections = document.querySelectorAll(".settings-section");

        navItems.forEach(item => {
            item.addEventListener("click", () => {
                navItems.forEach(nav => nav.classList.remove("active"));
                sections.forEach(sec => sec.classList.add("hidden"));
                item.classList.add("active");
                const targetId = item.getAttribute("data-target");
                document.getElementById(targetId).classList.remove("hidden");
            });
        });
    }

    initAccountForm() {
        const settingsForm = document.getElementById("settings-update-form");
        const otpSection = document.getElementById("settings-otp-section");

        if (!settingsForm) return;

        settingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const msgDiv = document.getElementById("settings-message");
            const saveBtn = document.getElementById("settings-save-btn");

            msgDiv.textContent = "Updating...";
            msgDiv.style.color = "#a0a0a0";
            saveBtn.disabled = true;

            const email = document.getElementById("settings-email").value;
            const current_password = document.getElementById("settings-current-password").value;
            const new_password = document.getElementById("settings-new-password").value;
            const confirm_password = document.getElementById("settings-confirm-password").value;

            try {
                const response = await fetch("/api/user/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, current_password, new_password, confirm_password })
                });

                const data = await response.json();
                saveBtn.disabled = false;

                if (response.ok) {
                    msgDiv.textContent = data.message || "Settings updated.";
                    msgDiv.style.color = "#4ade96";

                    document.getElementById("settings-current-password").value = "";
                    document.getElementById("settings-new-password").value = "";
                    document.getElementById("settings-confirm-password").value = "";

                    if (data.require_otp) {
                        settingsForm.classList.add("hidden");
                        otpSection.classList.remove("hidden");
                        document.getElementById("otp-instruction-text").textContent =
                            `Enter the 6-digit code sent to ${data.pending_email}`;
                    }
                } else {
                    msgDiv.textContent = data.error;
                    msgDiv.style.color = "#ff6b6d";
                }
            } catch (err) {
                msgDiv.textContent = "A network error occurred.";
                msgDiv.style.color = "#ff6b6d";
                saveBtn.disabled = false;
            }
        });
    }

    initOtpForm() {
        const settingsForm = document.getElementById("settings-update-form");
        const otpSection = document.getElementById("settings-otp-section");
        const otpForm = document.getElementById("settings-otp-form");
        const cancelOtpBtn = document.getElementById("cancel-otp-btn");

        if (otpForm) {
            otpForm.addEventListener("submit", async (e) => {
                e.preventDefault();

                const otpMsg = document.getElementById("otp-message");
                const verifyBtn = document.getElementById("verify-otp-btn");
                const otp = document.getElementById("settings-otp-input").value;

                otpMsg.textContent = "Verifying...";
                otpMsg.style.color = "#a0a0a0";
                verifyBtn.disabled = true;

                try {
                    const response = await fetch("/api/user/verify-email-change", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ otp })
                    });

                    const data = await response.json();
                    verifyBtn.disabled = false;

                    if (response.ok) {
                        document.getElementById("settings-otp-input").value = "";
                        otpSection.classList.add("hidden");
                        settingsForm.classList.remove("hidden");

                        const mainMsg = document.getElementById("settings-message");
                        mainMsg.textContent = "Email updated successfully!";
                        mainMsg.style.color = "#4ade96";
                    } else {
                        otpMsg.textContent = data.error;
                        otpMsg.style.color = "#ff6b6d";
                    }
                } catch (err) {
                    otpMsg.textContent = "A network error occurred.";
                    otpMsg.style.color = "#ff6b6d";
                    verifyBtn.disabled = false;
                }
            });
        }

        if (cancelOtpBtn) {
            cancelOtpBtn.addEventListener("click", () => {
                otpSection.classList.add("hidden");
                settingsForm.classList.remove("hidden");
                document.getElementById("settings-message").textContent = "Email change cancelled.";
                document.getElementById("settings-message").style.color = "#a0a0a0";
            });
        }
    }

    initEmailEdit() {
        const maskedSpan = document.getElementById("email-masked-display");
        const displayRow = document.getElementById("email-display-row");
        const editRow = document.getElementById("email-edit-row");
        const editBtn = document.getElementById("edit-email-btn");
        const cancelEmailBtn = document.getElementById("cancel-email-edit-btn");
        const emailInput = document.getElementById("settings-email");

        if (maskedSpan) {
            maskedSpan.textContent = this.maskEmail(maskedSpan.dataset.email || "");
        }

        if (editBtn) {
            editBtn.addEventListener("click", () => {
                displayRow.style.display = "none";
                editRow.style.display = "flex";
                if (emailInput) emailInput.focus();
            });
        }

        if (cancelEmailBtn) {
            cancelEmailBtn.addEventListener("click", () => {
                editRow.style.display = "none";
                displayRow.style.display = "flex";
                if (emailInput) emailInput.value = "";
            });
        }
    }

    maskEmail(email) {
        const [local, domain] = email.split("@");
        if (!domain) return email;
        return local[0] + "•".repeat(Math.max(local.length - 1, 3)) + "@" + domain;
    }
}