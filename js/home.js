// Navbar Scroll Effect
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Mobile Nav Toggle
const navToggle = document.getElementById('nav-toggle');
const navLinks = document.getElementById('nav-links');

navToggle?.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('active');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});

// Close mobile nav after a link is clicked
navLinks?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navToggle?.setAttribute('aria-expanded', 'false');
    });
});

// Scroll Reveal / Fade-in Animation
const fadeElements = document.querySelectorAll('.fade-in');

const appearOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
};

const appearOnScroll = new IntersectionObserver(function (entries, observer) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
    });
}, appearOptions);

fadeElements.forEach(el => {
    appearOnScroll.observe(el);
});

// Trigger visible on load for elements already in viewport
window.dispatchEvent(new Event('scroll'));

// Dynamic Login button update based on auth status
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('profitflow_token');
    if (token) {
        // Find all links to login.html and change to dashboard.html
        const authLinks = document.querySelectorAll('a[href="login.html"]');
        authLinks.forEach((link, idx) => {
            link.href = 'dashboard.html';
            if (link.textContent.trim() === 'Login') {
                link.textContent = 'Dashboard';
            } else if (link.textContent.trim() === 'Get Started') {
                link.textContent = 'Go to Dashboard';
            }
        });
    }
});