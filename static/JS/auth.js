document.addEventListener("DOMContentLoaded", function() {
    
    // --- 1. PASSWORD VISIBILITY TOGGLE ---
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');

    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const inputField = this.previousElementSibling;

            if (inputField.type === "password") {
                inputField.type = "text";
                this.textContent = "visibility_off"; 
                this.title = "Hide Password";
            } else {
                inputField.type = "password";
                this.textContent = "visibility"; 
                this.title = "Show Password";
            }
        });
    });

    // --- 2. SCROLL ANIMATIONS ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-show');
                observer.unobserve(entry.target); 
            }
        });
    }, {
        threshold: 0.15 
    });

    const elementsToAnimate = document.querySelectorAll('.section-title, .feature-card, #about div, #contact div');

    elementsToAnimate.forEach((el) => {
        el.classList.add('scroll-hidden');
        observer.observe(el);
    });
});