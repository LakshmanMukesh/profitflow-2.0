document.addEventListener('DOMContentLoaded', () => {
    // 1. Set Date
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }

    // Load dashboard stats
    loadDashboardData();
});

async function loadDashboardData() {
    try {
        const data = await window.API.getDashboardSummary();
        
        // Update user greeting name
        const welcomeEl = document.getElementById('welcome-message');
        if (welcomeEl && data.user_name) {
            welcomeEl.textContent = `Welcome Back, ${data.user_name}!`;
        }

        // Format currency helper
        const formatCurrency = (val) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2
            }).format(val);
        };

        // Set Stats
        document.getElementById('stat-income').textContent = formatCurrency(data.total_income || 0);
        document.getElementById('stat-expenses').textContent = formatCurrency(data.total_expense || 0);
        
        const balanceEl = document.getElementById('stat-balance');
        balanceEl.textContent = formatCurrency(data.balance || 0);
        if (data.balance < 0) {
            balanceEl.style.color = '#ef4444'; // Red if negative balance
        } else {
            balanceEl.style.color = '';
        }

        document.getElementById('stat-transactions-count').textContent = data.transaction_count || 0;

        // Render Recent Transactions
        const transactionsContainer = document.getElementById('recent-transactions-list');
        if (data.recent_transactions && data.recent_transactions.length > 0) {
            transactionsContainer.innerHTML = data.recent_transactions.map(t => {
                const badgeClass = t.type === 'income' ? 'badge income' : 'badge expense';
                const amountSign = t.type === 'income' ? '+' : '-';
                const amountClass = t.type === 'income' ? 'text-success' : 'text-danger';
                
                return `
                    <tr>
                        <td><strong>${t.description || 'No Description'}</strong></td>
                        <td>${t.category}</td>
                        <td>${t.date}</td>
                        <td class="${amountClass}"><strong>${amountSign} ${formatCurrency(t.amount)}</strong></td>
                        <td><span class="${badgeClass}">${t.type.toUpperCase()}</span></td>
                    </tr>
                `;
            }).join('');
        } else {
            transactionsContainer.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-light); padding: 30px;">
                        No recent transactions found. Click "New Transaction" to add one.
                    </td>
                </tr>
            `;
        }

        // Render Budgets
        const budgetsContainer = document.getElementById('dashboard-budgets-list');
        if (data.budgets && data.budgets.length > 0) {
            budgetsContainer.innerHTML = data.budgets.map(b => {
                const percent = Math.min(Math.round((b.spent / b.limit) * 100), 100);
                
                let fillClass = 'normal';
                if (percent >= 100) {
                    fillClass = 'danger';
                } else if (percent >= 80) {
                    fillClass = 'warning';
                }

                return `
                    <div class="progress-container">
                        <div class="progress-header">
                            <span class="progress-label">${b.category}</span>
                            <span class="progress-value">${formatCurrency(b.spent)} / ${formatCurrency(b.limit)} (${percent}%)</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar-fill ${fillClass}" style="width: ${percent}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            budgetsContainer.innerHTML = `
                <p style="font-size: 0.9rem; color: var(--text-light); text-align: center; padding: 20px 0;">
                    No budgets set for this month. <a href="budgets.html" style="color: var(--emerald); font-weight: 600;">Set Budget</a>
                </p>
            `;
        }

        // Render Savings Goals
        const goalsContainer = document.getElementById('dashboard-goals-list');
        if (data.goals && data.goals.length > 0) {
            goalsContainer.innerHTML = data.goals.map(g => {
                const percent = Math.min(Math.round((g.current / g.target) * 100), 100);
                
                return `
                    <div class="goal-card">
                        <div class="progress-container" style="margin-bottom: 0;">
                            <div class="progress-header">
                                <span class="progress-label">${g.name}</span>
                                <span class="progress-value">${formatCurrency(g.current)} / ${formatCurrency(g.target)} (${percent}%)</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill normal" style="width: ${percent}%"></div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            goalsContainer.innerHTML = `
                <p style="font-size: 0.9rem; color: var(--text-light); text-align: center; padding: 20px 0;">
                    No savings goals. <a href="goals.html" style="color: var(--emerald); font-weight: 600;">Create Goal</a>
                </p>
            `;
        }

    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
    }
}
