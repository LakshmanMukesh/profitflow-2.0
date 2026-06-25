const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Business', 'Other'];
const EXPENSE_CATEGORIES = ['Food', 'Travel', 'Shopping', 'Education', 'Bills', 'Health'];

let activeTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addBtn = document.getElementById('open-add-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-modal');
    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');
    
    const txTypeSelect = document.getElementById('tx-type');
    const txCategorySelect = document.getElementById('tx-category');
    
    const filterType = document.getElementById('filter-type');
    const filterCategory = document.getElementById('filter-category');
    const searchInput = document.getElementById('search-input');
    const resetFiltersBtn = document.getElementById('reset-filters');
    
    // Set default date to today in form
    document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);

    // Initial load
    populateCategoryDropdown(txTypeSelect.value, txCategorySelect);
    populateFilterCategories();
    loadTransactions();

    // Event Listeners
    addBtn?.addEventListener('click', () => {
        openModal(false);
    });

    [closeBtn, cancelBtn].forEach(btn => {
        btn?.addEventListener('click', () => {
            closeModal();
        });
    });

    txTypeSelect?.addEventListener('change', (e) => {
        populateCategoryDropdown(e.target.value, txCategorySelect);
    });

    // Form Submit
    form?.addEventListener('submit', handleFormSubmit);

    // Filters event listeners
    filterType?.addEventListener('change', () => {
        populateFilterCategories();
        loadTransactions();
    });
    filterCategory?.addEventListener('change', loadTransactions);
    
    let searchTimeout;
    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(loadTransactions, 300);
    });

    resetFiltersBtn?.addEventListener('click', () => {
        filterType.value = '';
        searchInput.value = '';
        populateFilterCategories();
        loadTransactions();
    });
});

// Dropdown population helpers
function populateCategoryDropdown(type, selectElement, includeAllOption = false) {
    const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    let html = includeAllOption ? '<option value="">All Categories</option>' : '';
    
    html += categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
    selectElement.innerHTML = html;
}

function populateFilterCategories() {
    const filterTypeVal = document.getElementById('filter-type').value;
    const filterCatSelect = document.getElementById('filter-category');
    
    if (!filterTypeVal) {
        // Merge all categories for "All" type
        let html = '<option value="">All Categories</option>';
        const allCats = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
        html += allCats.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        filterCatSelect.innerHTML = html;
    } else {
        populateCategoryDropdown(filterTypeVal, filterCatSelect, true);
    }
}

// Modal actions
function openModal(isEdit = false, item = null) {
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('transaction-form');
    
    modal.classList.add('active');
    
    if (isEdit && item) {
        title.textContent = 'Edit Transaction';
        document.getElementById('tx-id').value = item.id;
        document.getElementById('tx-type').value = item.type;
        
        populateCategoryDropdown(item.type, document.getElementById('tx-category'));
        document.getElementById('tx-category').value = item.category;
        
        document.getElementById('tx-amount').value = item.amount;
        document.getElementById('tx-date').value = item.date;
        document.getElementById('tx-description').value = item.description || '';
    } else {
        title.textContent = 'Add Transaction';
        form.reset();
        document.getElementById('tx-id').value = '';
        document.getElementById('tx-type').value = 'expense';
        populateCategoryDropdown('expense', document.getElementById('tx-category'));
        document.getElementById('tx-date').value = new Date().toISOString().substring(0, 10);
    }
}

function closeModal() {
    const modal = document.getElementById('transaction-modal');
    modal.classList.remove('active');
}

// Submit Form (Add / Edit)
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('tx-id').value;
    const type = document.getElementById('tx-type').value;
    const category = document.getElementById('tx-category').value;
    const amount = document.getElementById('tx-amount').value;
    const date = document.getElementById('tx-date').value;
    const description = document.getElementById('tx-description').value;

    const payload = { type, category, amount, date, description };

    try {
        if (id) {
            // Edit
            await window.API.editTransaction(id, payload);
        } else {
            // Add
            await window.API.addTransaction(payload);
        }
        closeModal();
        loadTransactions();
    } catch (error) {
        alert(error.message || 'Failed to save transaction');
    }
}

// Fetch list from API
async function loadTransactions() {
    const type = document.getElementById('filter-type').value;
    const category = document.getElementById('filter-category').value;
    const search = document.getElementById('search-input').value;

    const filters = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (search) filters.search = search;

    const listElement = document.getElementById('transactions-list');

    try {
        const transactions = await window.API.getTransactions(filters);
        activeTransactions = transactions;
        
        const formatCurrency = (val) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2
            }).format(val);
        };

        if (transactions.length > 0) {
            listElement.innerHTML = transactions.map(t => {
                const badgeClass = t.type === 'income' ? 'badge income' : 'badge expense';
                const amountSign = t.type === 'income' ? '+' : '-';
                const amountClass = t.type === 'income' ? 'text-success' : 'text-danger';
                
                return `
                    <tr>
                        <td>${t.date}</td>
                        <td><strong>${t.description || 'No Description'}</strong></td>
                        <td>${t.category}</td>
                        <td><span class="${badgeClass}">${t.type.toUpperCase()}</span></td>
                        <td class="${amountClass}"><strong>${amountSign} ${formatCurrency(t.amount)}</strong></td>
                        <td style="text-align: right;">
                            <button onclick="editTxItem(${t.id})" class="action-btn edit" title="Edit">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="deleteTxItem(${t.id})" class="action-btn delete" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            listElement.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-light); padding: 45px;">
                        No transactions found matching the filters.
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        listElement.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #ef4444; padding: 45px;">
                    Error loading transactions: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Global actions called from inline onclick events
window.editTxItem = function(id) {
    const item = activeTransactions.find(t => t.id === id);
    if (item) {
        openModal(true, item);
    }
};

window.deleteTxItem = async function(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        try {
            await window.API.deleteTransaction(id);
            loadTransactions();
        } catch (error) {
            alert(error.message || 'Failed to delete transaction');
        }
    }
};
