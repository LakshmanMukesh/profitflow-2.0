const EXPENSE_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Education', 'Bills', 'Health'];

document.addEventListener('DOMContentLoaded', () => {
    const budgetMonthInput = document.getElementById('budget-month');
    const filterMonthInput = document.getElementById('filter-month');
    const categorySelect = document.getElementById('budget-category');
    const budgetForm = document.getElementById('budget-form');

    // 1. Set current month as default (YYYY-MM)
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (budgetMonthInput) budgetMonthInput.value = currentMonth;
    if (filterMonthInput) filterMonthInput.value = currentMonth;

    // 2. Populate Category dropdown
    if (categorySelect) {
        categorySelect.innerHTML = EXPENSE_CATEGORIES.map(
            cat => `<option value="${cat}">${cat}</option>`
        ).join('');
    }

    // 3. Load budgets
    loadBudgets();

    // 4. Listen for filter changes
    filterMonthInput?.addEventListener('change', () => {
        // Sync the set budget form month
        budgetMonthInput.value = filterMonthInput.value;
        loadBudgets();
    });

    // 5. Submit Form
    budgetForm?.addEventListener('submit', handleBudgetSubmit);
});

async function handleBudgetSubmit(e) {
    e.preventDefault();

    const category = document.getElementById('budget-category').value;
    const amount = document.getElementById('budget-amount').value;
    const month = document.getElementById('budget-month').value;

    try {
        await window.API.setBudget({ category, amount, month });
        document.getElementById('budget-amount').value = '';
        loadBudgets();
    } catch (error) {
        alert(error.message || 'Failed to save budget');
    }
}

async function loadBudgets() {
    const month = document.getElementById('filter-month').value;
    const gridContainer = document.getElementById('budgets-grid-list');
    
    if (!gridContainer) return;

    try {
        const budgets = await window.API.getBudgets(month);
        
        const formatCurrency = (val) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2
            }).format(val);
        };

        let totalBudgeted = 0.0;
        let totalSpent = 0.0;

        if (budgets.length > 0) {
            gridContainer.innerHTML = budgets.map(b => {
                totalBudgeted += b.amount;
                totalSpent += b.spent;

                const percent = b.amount > 0 ? Math.round((b.spent / b.amount) * 100) : 0;
                
                let fillClass = 'normal';
                let alertText = 'Under Control';
                let alertColorClass = 'text-success';

                if (percent >= 100) {
                    fillClass = 'danger';
                    alertText = `Exceeded by ${formatCurrency(b.spent - b.amount)}`;
                    alertColorClass = 'text-danger';
                } else if (percent >= 80) {
                    fillClass = 'warning';
                    alertText = 'Close to limit!';
                    alertColorClass = 'text-danger'; // yellow/orange warning text
                    // We can style it differently
                }

                return `
                    <div class="budget-card">
                        <div class="budget-card-actions">
                            <button onclick="deleteBudgetItem(${b.id})" class="action-btn delete" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                        <h4 style="font-size: 1.1rem; margin-bottom: 4px; color: var(--black);">${b.category}</h4>
                        <span style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 16px;">Month: ${b.month}</span>
                        
                        <div class="progress-container" style="margin-bottom: 12px;">
                            <div class="progress-header">
                                <span class="progress-label">Spent</span>
                                <span class="progress-value">${percent}%</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill ${fillClass}" style="width: ${Math.min(percent, 100)}%"></div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-top: auto; padding-top: 10px; border-top: 1px dashed #f1f5f9;">
                            <div>
                                <p style="color: var(--text-light);">Limit</p>
                                <strong>${formatCurrency(b.amount)}</strong>
                            </div>
                            <div style="text-align: right;">
                                <p style="color: var(--text-light);">Spent</p>
                                <strong>${formatCurrency(b.spent)}</strong>
                            </div>
                        </div>

                        <div style="margin-top: 12px; font-size: 0.8rem; text-align: center; font-weight: 600;" class="${alertColorClass}">
                            ${alertText}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            gridContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-light); padding: 40px;">
                    No budgets set for this month. Use the "Set Budget" form on the left to set one.
                </div>
            `;
        }

        // Update overall summary card
        document.getElementById('total-budgeted').textContent = formatCurrency(totalBudgeted);
        document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
        
        const overallPercent = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;
        document.getElementById('total-percentage').textContent = `${overallPercent}%`;
        
        if (overallPercent > 100) {
            document.getElementById('total-spent').className = 'text-danger';
        } else if (overallPercent >= 80) {
            document.getElementById('total-spent').style.color = '#eab308'; // Warning yellow
        } else {
            document.getElementById('total-spent').style.color = 'var(--emerald)';
        }

    } catch (error) {
        console.error('Error fetching budgets:', error);
    }
}

window.deleteBudgetItem = async function(id) {
    if (confirm('Are you sure you want to delete this budget limit?')) {
        try {
            await window.API.deleteBudget(id);
            loadBudgets();
        } catch (error) {
            alert(error.message || 'Failed to delete budget limit');
        }
    }
};
