document.addEventListener('DOMContentLoaded', () => {
    loadProfitsData();
});

async function loadProfitsData() {
    try {
        const data = await window.API.getProfitsAnalytics();

        const formatCurrency = (val) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2
            }).format(val);
        };

        // 1. Update Core Stats
        document.getElementById('total-revenue').textContent = formatCurrency(data.revenue || 0);
        document.getElementById('total-operating-expenses').textContent = formatCurrency(data.operating_expenses || 0);
        
        const netProfitEl = document.getElementById('net-profit-val');
        netProfitEl.textContent = formatCurrency(data.net_profit || 0);
        
        const profitBadge = document.getElementById('profit-badge-wrapper');
        if (data.net_profit < 0) {
            netProfitEl.className = 'text-danger';
            if (profitBadge) {
                profitBadge.style.backgroundColor = '#fef2f2';
                profitBadge.style.color = '#ef4444';
            }
        } else {
            netProfitEl.className = 'text-success';
            if (profitBadge) {
                profitBadge.style.backgroundColor = '#ecfdf5';
                profitBadge.style.color = 'var(--emerald)';
            }
        }

        // Calculate margin
        const margin = data.revenue > 0 ? ((data.net_profit / data.revenue) * 100).toFixed(1) : '0.0';
        document.getElementById('profit-margin-val').textContent = `${margin}%`;

        // 2. Inventory Assets
        document.getElementById('inventory-asset-cost').textContent = formatCurrency(data.total_inventory_value || 0);
        document.getElementById('inventory-asset-profit').textContent = `+ ${formatCurrency(data.potential_profit || 0)}`;

        // 3. Operating Cost Breakdown Table
        const costList = document.getElementById('expense-breakdown-list');
        if (data.expense_breakdown && Object.keys(data.expense_breakdown).length > 0) {
            costList.innerHTML = Object.entries(data.expense_breakdown).map(([category, amount]) => {
                return `
                    <tr>
                        <td><strong>${category}</strong></td>
                        <td style="text-align: right;" class="text-danger"><strong>${formatCurrency(amount)}</strong></td>
                    </tr>
                `;
            }).join('');
        } else {
            costList.innerHTML = `
                <tr>
                    <td colspan="2" style="text-align: center; color: var(--text-light); padding: 40px;">
                        No expense entries logged.
                    </td>
                </tr>
            `;
        }

        // 4. Render 6-Month Trend Column Bars
        const chartContainer = document.getElementById('trend-bars-list');
        if (data.trend && data.trend.labels && data.trend.labels.length > 0) {
            const labels = data.trend.labels;
            const incomes = data.trend.income;
            const expenses = data.trend.expense;

            // Find max value to calibrate heights
            const maxVal = Math.max(...incomes, ...expenses, 100);

            chartContainer.innerHTML = labels.map((label, idx) => {
                const inc = incomes[idx] || 0;
                const exp = expenses[idx] || 0;

                const incHeight = Math.max(Math.round((inc / maxVal) * 180), 5); // min 5px height
                const expHeight = Math.max(Math.round((exp / maxVal) * 180), 5);

                return `
                    <div class="trend-column">
                        <div class="trend-bar-wrapper">
                            <div class="trend-bar income" style="height: ${incHeight}px;" title="Revenue: ${formatCurrency(inc)}"></div>
                            <div class="trend-bar expense" style="height: ${expHeight}px;" title="Expense: ${formatCurrency(exp)}"></div>
                        </div>
                        <span class="trend-label">${label}</span>
                    </div>
                `;
            }).join('');
        } else {
            chartContainer.innerHTML = `
                <div style="text-align: center; color: rgba(255, 255, 255, 0.4); padding: 50px 0; width: 100%;">
                    No trend history. Add transactions to build monthly data.
                </div>
            `;
        }

    } catch (error) {
        console.error('Error loading profits analytics:', error);
    }
}
