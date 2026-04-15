document.addEventListener("DOMContentLoaded", function () {

    // =========================================================
    // 1. PASSWORD VISIBILITY TOGGLE
    // Uses closest() to find the input safely instead of
    // relying on previousElementSibling, which breaks if the
    // DOM structure changes even slightly.
    // =========================================================
    const togglePasswordIcons = document.querySelectorAll('.toggle-password');

    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function () {
            const inputField = this.closest('.input-wrapper')?.querySelector('input');

            if (!inputField) return; // guard: skip if input not found

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


    // =========================================================
    // 2. SCROLL ANIMATIONS — section titles, cards, divs
    // Adds 'scroll-hidden' on load and 'scroll-show' when the
    // element enters the viewport. Unobserves after firing so
    // the animation only plays once and doesn't keep watching.
    // =========================================================
    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-show');
                scrollObserver.unobserve(entry.target); // stop watching after animating
            }
        });
    }, {
        threshold: 0.15
    });

    const elementsToAnimate = document.querySelectorAll('.section-title, .feature-card, #about div, #contact div');

    elementsToAnimate.forEach((el) => {
        el.classList.add('scroll-hidden');
        scrollObserver.observe(el);
    });


    // =========================================================
    // 3. DIVIDER ANIMATIONS
    // Same fix as above — unobserve after 'show' is applied so
    // the observer doesn't keep firing on every scroll past it.
    // =========================================================
    const dividerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                dividerObserver.unobserve(entry.target); // prevent repeated triggers
            }
        });
    }, {
        threshold: 0.5
    });

    const dividers = document.querySelectorAll('.title-divider');
    dividers.forEach(divider => dividerObserver.observe(divider));

});