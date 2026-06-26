document.addEventListener('DOMContentLoaded', () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    // Get current logged in user
    let user = { name: 'User', email: '' };
    try {
        const storedUser = localStorage.getItem('profitflow_user');
        if (storedUser) {
            user = JSON.parse(storedUser);
        }
    } catch (e) {
        console.error('Error parsing user data:', e);
    }

    const currentPath = window.location.pathname;
    const getLinkClass = (pageName) => {
        return currentPath.endsWith(pageName) ? 'sidebar-link active' : 'sidebar-link';
    };

    const userInitials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';

    sidebarContainer.innerHTML = `
        <div class="sidebar">
            <a href="index.html" class="sidebar-logo">
                <img src="img/logo.png" alt="ProfitFlow" class="nav-logo">
                Profit<span>Flow</span>
            </a>
            
            <div class="sidebar-menu">
                <a href="dashboard.html" class="${getLinkClass('dashboard.html')}">
                    <i class="fa-solid fa-chart-pie"></i>
                    <span>Dashboard</span>
                </a>
                <a href="transactions.html" class="${getLinkClass('transactions.html')}">
                    <i class="fa-solid fa-money-bill-transfer"></i>
                    <span>Transactions</span>
                </a>
                <a href="budgets.html" class="${getLinkClass('budgets.html')}">
                    <i class="fa-solid fa-wallet"></i>
                    <span>Budgets</span>
                </a>
                <a href="goals.html" class="${getLinkClass('goals.html')}">
                    <i class="fa-solid fa-bullseye"></i>
                    <span>Savings Goals</span>
                </a>
                <a href="inventory.html" class="${getLinkClass('inventory.html')}">
                    <i class="fa-solid fa-boxes-stacked"></i>
                    <span>Inventory</span>
                </a>
                <a href="profits.html" class="${getLinkClass('profits.html')}">
                    <i class="fa-solid fa-chart-line"></i>
                    <span>Profits</span>
                </a>
                <a href="reports.html" class="${getLinkClass('reports.html')}">
                    <i class="fa-solid fa-file-invoice-dollar"></i>
                    <span>Reports</span>
                </a>
                <a href="profile.html" class="${getLinkClass('profile.html')}">
                    <i class="fa-solid fa-user-gear"></i>
                    <span>Settings</span>
                </a>
            </div>
            
            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="user-avatar">${userInitials}</div>
                    <div class="user-info">
                        <h5>${user.name}</h5>
                        <p>${user.email}</p>
                    </div>
                </div>
                <button id="sidebar-logout" class="logout-btn">
                    <i class="fa-solid fa-right-from-bracket"></i>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    `;

    // Logout button handler
    const logoutBtn = document.getElementById('sidebar-logout');
    logoutBtn?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to log out?')) {
            if (window.API && window.API.logout) {
                await window.API.logout();
            } else {
                localStorage.removeItem('profitflow_token');
                localStorage.removeItem('profitflow_user');
                window.location.href = 'login.html';
            }
        }
    });
});
