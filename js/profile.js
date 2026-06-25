document.addEventListener('DOMContentLoaded', () => {
    const detailsForm = document.getElementById('profile-details-form');
    const passwordForm = document.getElementById('profile-password-form');
    
    // Load current profile data
    let user = { name: '', email: '' };
    try {
        const storedUser = localStorage.getItem('profitflow_user');
        if (storedUser) {
            user = JSON.parse(storedUser);
        }
    } catch (e) {
        console.error(e);
    }

    // Prefill fields
    if (document.getElementById('profile-name')) {
        document.getElementById('profile-name').value = user.name || '';
    }
    if (document.getElementById('profile-email')) {
        document.getElementById('profile-email').value = user.email || '';
    }

    // Details form submit
    detailsForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('profile-name').value.trim();
        const email = document.getElementById('profile-email').value.trim();

        if (!name || !email) {
            alert('Please fill in all details.');
            return;
        }

        try {
            const data = await window.API.updateProfile({ name, email });
            localStorage.setItem('profitflow_user', JSON.stringify(data.user));
            alert('Personal details updated successfully!');
            window.location.reload(); // Reload to refresh sidebar user info
        } catch (error) {
            alert(error.message || 'Failed to update profile details.');
        }
    });

    // Password form submit
    passwordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;

        if (!currentPassword || !newPassword || !confirmPassword) {
            alert('Please fill in all password fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }

        try {
            await window.API.updateProfile({
                current_password: currentPassword,
                new_password: newPassword
            });
            alert('Password updated successfully!');
            passwordForm.reset();
        } catch (error) {
            alert(error.message || 'Failed to update password.');
        }
    });
});
