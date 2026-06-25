let activeGoals = [];

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const openModalBtn = document.getElementById('open-goal-modal');
    const closeModalBtn = document.getElementById('close-goal-modal');
    const cancelModalBtn = document.getElementById('cancel-goal-modal');
    const modal = document.getElementById('goal-modal');
    const form = document.getElementById('goal-form');

    const depositModal = document.getElementById('deposit-modal');
    const closeDepositBtn = document.getElementById('close-deposit-modal');
    const cancelDepositBtn = document.getElementById('cancel-deposit-modal');
    const depositForm = document.getElementById('deposit-form');

    // Load initial list
    loadGoals();

    // Event listeners
    openModalBtn?.addEventListener('click', () => openGoalModal(false));
    [closeModalBtn, cancelModalBtn].forEach(btn => {
        btn?.addEventListener('click', closeGoalModal);
    });

    [closeDepositBtn, cancelDepositBtn].forEach(btn => {
        btn?.addEventListener('click', closeDepositModal);
    });

    form?.addEventListener('submit', handleFormSubmit);
    depositForm?.addEventListener('submit', handleDepositSubmit);
});

async function loadGoals() {
    const gridContainer = document.getElementById('goals-grid-list');
    if (!gridContainer) return;

    try {
        const goals = await window.API.getGoals();
        activeGoals = goals;

        const formatCurrency = (val) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2
            }).format(val);
        };

        if (goals.length > 0) {
            gridContainer.innerHTML = goals.map(g => {
                const percent = g.target_amount > 0 ? Math.min(Math.round((g.current_amount / g.target_amount) * 100), 100) : 0;
                const remaining = Math.max(g.target_amount - g.current_amount, 0);
                
                // Calculate days remaining
                const targetDate = new Date(g.target_date);
                const today = new Date();
                const diffTime = targetDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const daysText = diffDays > 0 ? `${diffDays} days left` : (diffDays === 0 ? 'Deadline today!' : 'Overdue!');
                const daysClass = diffDays >= 0 ? 'text-success' : 'text-danger';

                return `
                    <div class="budget-card">
                        <div class="budget-card-actions">
                            <button onclick="editGoalItem(${g.id})" class="action-btn edit" title="Edit">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="deleteGoalItem(${g.id})" class="action-btn delete" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                        <h4 style="font-size: 1.15rem; margin-bottom: 4px; color: var(--black);">${g.name}</h4>
                        <span style="font-size: 0.8rem; color: var(--text-light); margin-bottom: 16px;">Target: ${g.target_date} (${daysText})</span>
                        
                        <div class="progress-container" style="margin-bottom: 12px; margin-top: 10px;">
                            <div class="progress-header">
                                <span class="progress-label">Saved</span>
                                <span class="progress-value">${percent}%</span>
                            </div>
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill normal" style="width: ${percent}%"></div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding-top: 10px; border-top: 1px dashed #f1f5f9; margin-bottom: 16px;">
                            <div>
                                <p style="color: var(--text-light);">Saved</p>
                                <strong>${formatCurrency(g.current_amount)}</strong>
                            </div>
                            <div style="text-align: right;">
                                <p style="color: var(--text-light);">Target</p>
                                <strong>${formatCurrency(g.target_amount)}</strong>
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px; margin-top: auto;">
                            <button onclick="openDepositModal(${g.id})" class="btn btn-primary" style="flex: 1; padding: 8px; font-size: 0.8rem; box-shadow: none;">
                                <i class="fa-solid fa-plus"></i> Add Savings
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            gridContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; color: var(--text-light); padding: 40px;">
                    No savings goals created. Click "Create Goal" in the top right to start.
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading goals:', error);
    }
}

// Goal Modal Actions
function openGoalModal(isEdit = false, item = null) {
    const modal = document.getElementById('goal-modal');
    const title = document.getElementById('goal-modal-title');
    const form = document.getElementById('goal-form');
    
    modal.classList.add('active');
    
    if (isEdit && item) {
        title.textContent = 'Edit Savings Goal';
        document.getElementById('goal-id').value = item.id;
        document.getElementById('goal-name').value = item.name;
        document.getElementById('goal-target').value = item.target_amount;
        document.getElementById('goal-current').value = item.current_amount;
        document.getElementById('goal-date').value = item.target_date;
    } else {
        title.textContent = 'Create Savings Goal';
        form.reset();
        document.getElementById('goal-id').value = '';
        document.getElementById('goal-current').value = 0;
        document.getElementById('goal-date').value = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10); // +30 days default
    }
}

function closeGoalModal() {
    document.getElementById('goal-modal').classList.remove('active');
}

// Deposit Modal Actions
function openDepositModal(goalId) {
    document.getElementById('deposit-goal-id').value = goalId;
    document.getElementById('deposit-amount').value = '';
    document.getElementById('deposit-modal').classList.add('active');
}

function closeDepositModal() {
    document.getElementById('deposit-modal').classList.remove('active');
}

// Handlers
async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('goal-id').value;
    const name = document.getElementById('goal-name').value;
    const target_amount = document.getElementById('goal-target').value;
    const current_amount = document.getElementById('goal-current').value || 0;
    const target_date = document.getElementById('goal-date').value;

    const payload = { name, target_amount, current_amount, target_date };

    try {
        if (id) {
            await window.API.editGoal(id, payload);
        } else {
            await window.API.addGoal(payload);
        }
        closeGoalModal();
        loadGoals();
    } catch (error) {
        alert(error.message || 'Failed to save savings goal');
    }
}

async function handleDepositSubmit(e) {
    e.preventDefault();

    const goalId = document.getElementById('deposit-goal-id').value;
    const depositAmount = parseFloat(document.getElementById('deposit-amount').value);
    
    if (isNaN(depositAmount) || depositAmount <= 0) return;

    const goal = activeGoals.find(g => g.id == goalId);
    if (!goal) return;

    const newCurrent = goal.current_amount + depositAmount;

    try {
        await window.API.editGoal(goalId, {
            current_amount: newCurrent
        });
        closeDepositModal();
        loadGoals();
    } catch (error) {
        alert(error.message || 'Failed to contribute savings');
    }
}

window.editGoalItem = function(id) {
    const item = activeGoals.find(g => g.id === id);
    if (item) {
        openGoalModal(true, item);
    }
};

window.deleteGoalItem = async function(id) {
    if (confirm('Are you sure you want to delete this savings goal?')) {
        try {
            await window.API.deleteGoal(id);
            loadGoals();
        } catch (error) {
            alert(error.message || 'Failed to delete goal');
        }
    }
};
