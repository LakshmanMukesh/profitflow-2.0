document.addEventListener('DOMContentLoaded', () => {
    const reportMonthInput = document.getElementById('report-month');

    // Default to current month (YYYY-MM)
    const currentMonth = new Date().toISOString().substring(0, 7);
    if (reportMonthInput) {
        reportMonthInput.value = currentMonth;
    }

    // Set generated date timestamp
    const timestampEl = document.getElementById('report-generated-at');
    if (timestampEl) {
        timestampEl.textContent = `Generated on: ${new Date().toLocaleDateString('en-US')}`;
    }

    // Load initial statement
    loadReportStatement();

    // Event listener
    reportMonthInput?.addEventListener('change', loadReportStatement);
});

async function loadReportStatement() {
    const selectedMonth = document.getElementById('report-month').value;
    const periodText = document.getElementById('report-period-text');
    const tableBody = document.getElementById('report-transactions-log');
    
    if (!selectedMonth) return;

    // Format Period Title (e.g. June 2026)
    const [year, month] = selectedMonth.split('-');
    const monthName = new Date(year, parseInt(month) - 1).toLocaleString('en-US', { month: 'long' });
    if (periodText) {
        periodText.textContent = `Statement Period: ${monthName} ${year}`;
    }

    try {
        // Fetch all transactions and filter by month locally
        const transactions = await window.API.getTransactions();
        const monthlyTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

        const formatCurrency = (val) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2
            }).format(val);
        };

        let totalRev = 0.0;
        let totalExp = 0.0;

        if (monthlyTransactions.length > 0) {
            tableBody.innerHTML = monthlyTransactions.map(t => {
                const amountSign = t.type === 'income' ? '+' : '-';
                const amountClass = t.type === 'income' ? 'text-success' : 'text-danger';
                
                if (t.type === 'income') {
                    totalRev += t.amount;
                } else {
                    totalExp += t.amount;
                }

                return `
                    <tr>
                        <td>${t.date}</td>
                        <td><strong>${t.description || 'No Description'}</strong></td>
                        <td>${t.category}</td>
                        <td><span style="font-size:0.8rem; font-weight:600; text-transform:uppercase;">${t.type}</span></td>
                        <td style="text-align: right;" class="${amountClass}"><strong>${amountSign} ${formatCurrency(t.amount)}</strong></td>
                    </tr>
                `;
            }).join('');
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: var(--text-light); padding: 40px;">
                        No transactions recorded for this month.
                    </td>
                </tr>
            `;
        }

        // Update core statements metrics
        document.getElementById('report-revenue').textContent = formatCurrency(totalRev);
        document.getElementById('report-expenses').textContent = formatCurrency(totalExp);
        
        const netProfit = totalRev - totalExp;
        const netProfitEl = document.getElementById('report-net-profit');
        netProfitEl.textContent = formatCurrency(netProfit);
        if (netProfit < 0) {
            netProfitEl.className = 'text-danger';
        } else {
            netProfitEl.className = 'text-success';
        }

    } catch (error) {
        console.error('Error generating financial report:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: #ef4444; padding: 40px;">
                    Error generating report: ${error.message}
                </td>
            </tr>
        `;
    }
}
