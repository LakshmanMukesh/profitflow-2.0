let activeInventory = [];

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const openBtn = document.getElementById('open-inventory-modal');
    const closeBtn = document.getElementById('close-inventory-modal');
    const cancelBtn = document.getElementById('cancel-inventory-modal');
    const modal = document.getElementById('inventory-modal');
    const form = document.getElementById('inventory-form');

    // Load list
    loadInventory();

    // Event listeners
    openBtn?.addEventListener('click', () => openInventoryModal(false));
    [closeBtn, cancelBtn].forEach(btn => {
        btn?.addEventListener('click', closeInventoryModal);
    });
    form?.addEventListener('submit', handleFormSubmit);
});

async function loadInventory() {
    const listElement = document.getElementById('inventory-list');
    if (!listElement) return;

    try {
        const items = await window.API.getInventory();
        activeInventory = items;

        const formatCurrency = (val) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2
            }).format(val);
        };

        let totalQty = 0;
        let totalCost = 0.0;
        let potentialProfit = 0.0;

        if (items.length > 0) {
            listElement.innerHTML = items.map(item => {
                const stockVal = item.quantity * item.purchase_cost;
                const markupProfit = item.quantity * (item.selling_price - item.purchase_cost);
                
                totalQty += item.quantity;
                totalCost += stockVal;
                potentialProfit += markupProfit;

                const isLowStock = item.quantity < 5;
                const lowStockClass = isLowStock ? 'low-stock' : '';
                const qtyBadge = isLowStock 
                    ? `<span class="badge expense" style="font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> Low (${item.quantity})</span>` 
                    : `<span class="badge income">${item.quantity}</span>`;

                return `
                    <tr class="${lowStockClass}">
                        <td><strong>${item.name}</strong></td>
                        <td>${qtyBadge}</td>
                        <td>${formatCurrency(item.purchase_cost)}</td>
                        <td>${formatCurrency(item.selling_price)}</td>
                        <td><strong>${formatCurrency(stockVal)}</strong></td>
                        <td class="text-success"><strong>+ ${formatCurrency(markupProfit)}</strong></td>
                        <td style="text-align: right;">
                            <button onclick="editInventoryItem(${item.id})" class="action-btn edit" title="Edit">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="deleteInventoryItem(${item.id})" class="action-btn delete" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            listElement.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-light); padding: 45px;">
                        No products in inventory. Click "Add Product" to create your stock list.
                    </td>
                </tr>
            `;
        }

        // Update stats
        document.getElementById('total-items').textContent = totalQty;
        document.getElementById('total-inventory-cost').textContent = formatCurrency(totalCost);
        document.getElementById('total-potential-profit').textContent = formatCurrency(potentialProfit);

    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

function openInventoryModal(isEdit = false, item = null) {
    const modal = document.getElementById('inventory-modal');
    const title = document.getElementById('inventory-modal-title');
    const form = document.getElementById('inventory-form');
    
    modal.classList.add('active');
    
    if (isEdit && item) {
        title.textContent = 'Edit Product Details';
        document.getElementById('item-id').value = item.id;
        document.getElementById('item-name').value = item.name;
        document.getElementById('item-quantity').value = item.quantity;
        document.getElementById('item-cost').value = item.purchase_cost;
        document.getElementById('item-price').value = item.selling_price;
    } else {
        title.textContent = 'Add New Product';
        form.reset();
        document.getElementById('item-id').value = '';
        document.getElementById('item-quantity').value = 0;
    }
}

function closeInventoryModal() {
    document.getElementById('inventory-modal').classList.remove('active');
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('item-id').value;
    const name = document.getElementById('item-name').value;
    const quantity = document.getElementById('item-quantity').value;
    const purchase_cost = document.getElementById('item-cost').value;
    const selling_price = document.getElementById('item-price').value;

    const payload = { name, quantity, purchase_cost, selling_price };

    try {
        if (id) {
            await window.API.editInventoryItem(id, payload);
        } else {
            await window.API.addInventoryItem(payload);
        }
        closeInventoryModal();
        loadInventory();
    } catch (error) {
        alert(error.message || 'Failed to save product');
    }
}

window.editInventoryItem = function(id) {
    const item = activeInventory.find(i => i.id === id);
    if (item) {
        openInventoryModal(true, item);
    }
};

window.deleteInventoryItem = async function(id) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await window.API.deleteInventoryItem(id);
            loadInventory();
        } catch (error) {
            alert(error.message || 'Failed to delete product');
        }
    }
};
