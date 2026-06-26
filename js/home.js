document.addEventListener("DOMContentLoaded", async () => {
    // Check if token exists
    const token = localStorage.getItem('profitflow_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const nameDisplay = document.getElementById('user-display-name');

    // 1. Try loading from localStorage first for fast rendering
    try {
        const storedUser = localStorage.getItem('profitflow_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user && user.name && nameDisplay) {
                nameDisplay.textContent = user.name;
            }
        }
    } catch (e) {
        console.error('Error reading cached user data:', e);
    }

    // 2. Fetch fresh user data from API
    try {
        if (window.API && window.API.getMe) {
            const freshUser = await window.API.getMe();
            if (freshUser && freshUser.name && nameDisplay) {
                nameDisplay.textContent = freshUser.name;
                // Update local storage cache
                localStorage.setItem('profitflow_user', JSON.stringify(freshUser));
            }
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
    }
});