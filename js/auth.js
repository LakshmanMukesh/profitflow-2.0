document.addEventListener("DOMContentLoaded", () => {
    const loginContainer = document.getElementById('login-form-container');
    const signupContainer = document.getElementById('signup-form-container');
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (!loginContainer || !signupContainer || !loginForm || !signupForm) {
        return;
    }

    const switchToSignup = (e) => {
        if (e) e.preventDefault();
        loginContainer.classList.add('hidden');
        signupContainer.classList.remove('hidden');
        signupContainer.style.opacity = '0';
        setTimeout(() => {
            signupContainer.style.transition = 'opacity 0.35s ease';
            signupContainer.style.opacity = '1';
        }, 10);
    };

    const switchToLogin = (e) => {
        if (e) e.preventDefault();
        signupContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        loginContainer.style.opacity = '0';
        setTimeout(() => {
            loginContainer.style.transition = 'opacity 0.35s ease';
            loginContainer.style.opacity = '1';
        }, 10);
    };

    showSignupBtn?.addEventListener('click', switchToSignup);
    showLoginBtn?.addEventListener('click', switchToLogin);

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-userid').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        if (!name || !email || !password || !confirmPassword) {
            alert('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        try {
            await window.API.signup(name, email, password);
            alert('Account created successfully! Please sign in.');
            signupForm.reset();
            switchToLogin();
        } catch (error) {
            alert(error.message || 'Signup failed. Please try again.');
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-userid').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const data = await window.API.login(email, password);
            localStorage.setItem('profitflow_token', data.token);
            localStorage.setItem('profitflow_user', JSON.stringify(data.user));
            
            // Redirect to dashboard page
            window.location.href = 'dashboard.html';
        } catch (error) {
            alert(error.message || 'Invalid Email address or Password.');
        }
    });
});