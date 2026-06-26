const API_BASE_URL = window.location.origin.includes(':5500')
    ? 'http://localhost:5000'
    : ''; // Use relative paths for direct Flask serving and production deployment (Railway)

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('profitflow_token');
    
    // Prepare headers
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        // Handle 401 Unauthorized (invalid/expired token)
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) {
            localStorage.removeItem('profitflow_token');
            localStorage.removeItem('profitflow_user');
            if (!window.location.pathname.endsWith('login.html')) {
                window.location.href = 'login.html';
            }
            throw new Error('Session expired. Please log in again.');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }
        
        return data;
    } catch (error) {
        console.error(`API Error on ${endpoint}:`, error);
        throw error;
    }
}

// Global Auth and Navigation State Check
function checkAuth() {
    const token = localStorage.getItem('profitflow_token');
    const isLoginPage = window.location.pathname.endsWith('login.html');
    
    if (!token && !isLoginPage) {
        window.location.href = 'login.html';
    } else if (token && isLoginPage) {
        window.location.href = 'dashboard.html';
    }
}

// Run auth check automatically when api.js loads
document.addEventListener('DOMContentLoaded', checkAuth);

// Export API helper functions to global window object
window.API = {
    request: apiRequest,
    
    // Auth
    signup: (name, email, password) => 
        apiRequest('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
        
    login: (email, password) => 
        apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
        
    logout: async () => {
        try {
            await apiRequest('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.warn('Backend logout failed/ignored:', e);
        }
        localStorage.removeItem('profitflow_token');
        localStorage.removeItem('profitflow_user');
        window.location.href = 'login.html';
    },
    
    getMe: () => apiRequest('/api/auth/me'),
    
    // Dashboard
    getDashboardSummary: () => apiRequest('/api/dashboard'),
    
    // Transactions
    getTransactions: (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return apiRequest(`/api/transactions?${queryParams}`);
    },
    addTransaction: (txData) => 
        apiRequest('/api/transactions', { method: 'POST', body: JSON.stringify(txData) }),
    editTransaction: (id, txData) => 
        apiRequest(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(txData) }),
    deleteTransaction: (id) => 
        apiRequest(`/api/transactions/${id}`, { method: 'DELETE' }),
        
    // Budgets
    getBudgets: (month) => {
        const url = month ? `/api/budgets?month=${month}` : '/api/budgets';
        return apiRequest(url);
    },
    setBudget: (budgetData) => 
        apiRequest('/api/budgets', { method: 'POST', body: JSON.stringify(budgetData) }),
    deleteBudget: (id) => 
        apiRequest(`/api/budgets/${id}`, { method: 'DELETE' }),
        
    // Goals
    getGoals: () => apiRequest('/api/goals'),
    addGoal: (goalData) => 
        apiRequest('/api/goals', { method: 'POST', body: JSON.stringify(goalData) }),
    editGoal: (id, goalData) => 
        apiRequest(`/api/goals/${id}`, { method: 'PUT', body: JSON.stringify(goalData) }),
    deleteGoal: (id) => 
        apiRequest(`/api/goals/${id}`, { method: 'DELETE' }),
        
    // Inventory
    getInventory: () => apiRequest('/api/inventory'),
    addInventoryItem: (itemData) => 
        apiRequest('/api/inventory', { method: 'POST', body: JSON.stringify(itemData) }),
    editInventoryItem: (id, itemData) => 
        apiRequest(`/api/inventory/${id}`, { method: 'PUT', body: JSON.stringify(itemData) }),
    deleteInventoryItem: (id) => 
        apiRequest(`/api/inventory/${id}`, { method: 'DELETE' }),
        
    // Profits & Trends
    getProfitsAnalytics: () => apiRequest('/api/profits'),
    
    // Profile
    updateProfile: (profileData) => 
        apiRequest('/api/profile', { method: 'PUT', body: JSON.stringify(profileData) })
};
