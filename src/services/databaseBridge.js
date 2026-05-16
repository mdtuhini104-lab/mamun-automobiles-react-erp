import axios from 'axios';
import { getApiBaseUrl } from '../utils/appConfig';

const rawMode = (
    import.meta.env.VITE_DATABASE_MODE ||
    import.meta.env.REACT_APP_DATABASE_MODE ||
    'CUSTOM'
).toUpperCase();

const rawSyncMode = (
    import.meta.env.VITE_DATABASE_SYNC_MODE ||
    import.meta.env.REACT_APP_DATABASE_SYNC_MODE ||
    'SINGLE'
).toUpperCase();

const apiBaseUrl = getApiBaseUrl();

const KEY_TO_ENDPOINT = {
    jobCards: { list: '/job-cards', bulk: '/job-cards/bulk' },
    inventory: { list: '/inventory', bulk: '/inventory/bulk' },
    salaries: { list: '/staff-salaries', bulk: '/staff-salaries/bulk' },
    cashInEntries: { list: '/finance/cash-in', bulk: '/finance/cash-in/bulk' },
    expenses: { list: '/finance/expenses', bulk: '/finance/expenses/bulk' },
    payments: { list: '/finance/payments', bulk: '/finance/payments/bulk' },
    savedBills: { list: '/finance/bills', bulk: '/finance/bills/bulk' },
    users: { list: '/users' },
    quotations: { list: '/quotations' },
    suppliers: { list: '/suppliers' },
    loans: { list: '/loans' },
    customers: { list: '/customers' },
    purchases: { list: '/purchases' },
    jobIntakes: { list: '/job-intakes', bulk: '/job-intakes/bulk' },
    inventoryAlerts: { list: '/inventory/alerts' },
    rtvs: { list: '/rtvs' },
    usedItems: { list: '/automotive/used-items', bulk: '/automotive/used-items/bulk' }
};

const api = axios.create({
    baseURL: apiBaseUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Response interceptor to handle session expiry (401/403)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.warn('[databaseBridge] Session expired or unauthorized. Clearing state...');
            localStorage.clear();
            sessionStorage.clear();
            // Optional: notify user or redirect. For now, we'll let the app handle the state change.
            if (typeof window !== 'undefined') {
                window.location.hash = '#/login';
            }
        }
        return Promise.reject(error);
    }
);

// Helper to inject user headers for RBAC enforcement
const applyUserHeaders = (user) => {
    if (!user) return;
    console.log('[databaseBridge] Applying headers for user:', JSON.stringify(user));
    const userId = String(user.id || '').trim();
    const userRole = String(user.role || '').trim();
    const userPost = String(user.specific_post || '').trim();
    const userEmail = String(user.email || '').trim().toLowerCase();

    if (userId) {
        api.defaults.headers.common['x-user-id'] = userId;
    } else {
        delete api.defaults.headers.common['x-user-id'];
    }

    if (userRole) {
        api.defaults.headers.common['x-user-role'] = userRole;
    } else {
        delete api.defaults.headers.common['x-user-role'];
    }

    if (userPost) {
        api.defaults.headers.common['x-user-post'] = userPost;
    } else {
        delete api.defaults.headers.common['x-user-post'];
    }

    if (userEmail) {
        api.defaults.headers.common['x-user-email'] = userEmail;
    } else {
        delete api.defaults.headers.common['x-user-email'];
    }

    if (user.vehicleNo) {
        api.defaults.headers.common['x-user-vehicle'] = String(user.vehicleNo).trim();
    } else {
        delete api.defaults.headers.common['x-user-vehicle'];
    }

    if (user.phone) {
        api.defaults.headers.common['x-user-phone'] = String(user.phone).trim();
    } else {
        delete api.defaults.headers.common['x-user-phone'];
    }
};

const clearAuthHeaders = () => {
    ['x-user-id', 'x-user-role', 'x-user-post', 'x-user-email', 'x-user-vehicle', 'x-user-phone'].forEach((header) => {
        delete api.defaults.headers.common[header];
    });
    // Also clear from local storage just in case
    localStorage.removeItem('mamun_auth_session');
    localStorage.removeItem('mamun_auth_user');
};

const unwrap = (response) => {
    if (response?.data?.success === false) {
        throw new Error(response.data.message || 'Request failed.');
    }
    return response?.data?.data ?? response?.data ?? null;
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const databaseBridge = {
    getMode: () => rawMode,
    isCustomMode: () => rawMode === 'CUSTOM',
    supportsCollection: (key) => {
        return !!KEY_TO_ENDPOINT && !!KEY_TO_ENDPOINT[key];
    },
    shouldUseCustomForKey(key) {
        return this?.supportsCollection?.(key) || false;
    },
    async fetchCollection(key, params = {}) {
        const config = KEY_TO_ENDPOINT[key];
        if (!config) return [];
        const response = await api.get(config.list, { params });
        const resData = unwrap(response);
        if (response.data && response.data.pagination) {
            return { data: asArray(resData), pagination: response.data.pagination };
        }
        return asArray(resData);
    },
    async searchCustomers(query) {
        if (!query) return [];
        const response = await api.get(`/customers/search?q=${encodeURIComponent(query)}`);
        return asArray(unwrap(response));
    },
    async fetchCustomerRelationalData(customerIdOrName) {
        if (!customerIdOrName) return null;
        try {
            console.log(`[databaseBridge] Fetching relational data for: ${customerIdOrName}`);
            // Updated route to match backend change
            const response = await api.get(`/customers/relational-data/${encodeURIComponent(customerIdOrName)}`);
            return unwrap(response);
        } catch (err) {
            console.error('Error fetching customer relational data:', err);
            return null;
        }
    },
    async fetchCustomerPortalData(identifier) {
        if (!identifier) return null;
        try {
            console.log(`[databaseBridge] Fetching full portal data for: ${identifier}`);
            const response = await api.get(`/customers/portal-data/${encodeURIComponent(identifier)}`);
            return unwrap(response);
        } catch (err) {
            console.error('[databaseBridge] Error fetching customer portal data:', err);
            return null;
        }
    },
    async saveCollection(key, items) {
        const config = KEY_TO_ENDPOINT[key];
        if (!config) return asArray(items);
        const response = await api.put(config.bulk, { items: asArray(items) });
        const resData = unwrap(response);
        return asArray(resData);
    },
    async addCashInEntry(entry) {
        const response = await api.post('/finance/cash-in', entry || {});
        return unwrap(response);
    },
    async fetchFinanceSummary(params = {}) {
        const response = await api.get('/finance/summary', { params });
        return unwrap(response);
    },
    // Low Stock Alerts
    async fetchLowStock(params = {}) {
        const response = await api.get('/inventory/alerts', { params });
        return asArray(unwrap(response));
    },
    async fetchFinancialTrend(params = {}) {
        const response = await api.get('/finance/trends', { params });
        return asArray(unwrap(response));
    },
    async fetchCheques(params = {}) {
        const response = await api.get('/finance/cheques', { params });
        return asArray(unwrap(response));
    },
    async createCheque(payload) {
        const response = await api.post('/finance/cheques', payload || {});
        return unwrap(response);
    },
    async updateChequeStatus(id, payload) {
        const response = await api.patch(`/finance/cheques/${id}/status`, payload || {});
        return unwrap(response);
    },
    async login(identifier, password) {
        const response = await api.post('/auth/login', { identifier, password });
        return unwrap(response);
    },
    // ==========================================
    // GRN (Goods Received Notes)
    // ==========================================
    async fetchGRNs() {
        const response = await api.get('/grns');
        return unwrap(response);
    },
    async createGRN(data) {
        const response = await api.post('/grns', data);
        return unwrap(response);
    },

    setCurrentUser(user) {
        if (user) {
            applyUserHeaders(user);
        } else {
            clearAuthHeaders();
        }
    },
    clearAuthHeaders,
    // User Management Specific Methods
    async fetchUsers(currentUser) {
        if (currentUser) applyUserHeaders(currentUser);
        const response = await api.get('/users');
        return asArray(unwrap(response));
    },
    async addUser(userData, currentUser) {
        if (currentUser) applyUserHeaders(currentUser);
        const response = await api.post('/users', userData || {});
        return unwrap(response);
    },
    async deleteUser(userId, currentUser) {
        if (currentUser) applyUserHeaders(currentUser);
        const response = await api.delete(`/users/${userId}`);
        return unwrap(response);
    },
    // Supplier Methods
    async fetchSuppliers() {
        const response = await api.get('/suppliers');
        return asArray(unwrap(response));
    },
    async addSupplier(data) {
        const response = await api.post('/suppliers', data);
        return unwrap(response);
    },
    async addSupplierTransaction(id, data) {
        const response = await api.post(`/suppliers/${id}/transactions`, data);
        return unwrap(response);
    },
    async addSupplierReturn(id, data) {
        const response = await api.post(`/suppliers/${id}/returns`, data);
        return unwrap(response);
    },
    async fetchSupplierBills(id) {
        const response = await api.get(`/suppliers/${id}/bills`);
        return asArray(unwrap(response));
    },
    async paySupplierBills(id, data) {
        const response = await api.post(`/suppliers/${id}/pay`, data);
        return unwrap(response);
    },
    // Loan Methods
    async fetchLoans() {
        const response = await api.get('/loans');
        return asArray(unwrap(response));
    },
    async addLoan(data) {
        const response = await api.post('/loans', data);
        return unwrap(response);
    },
    async payLoanInstallment(id, data) {
        const response = await api.post(`/loans/${id}/pay`, data);
        return unwrap(response);
    },
    // Quotation Methods
    async fetchQuotations() {
        const response = await api.get('/quotations');
        return asArray(unwrap(response));
    },
    async addQuotation(data) {
        const response = await api.post('/quotations', data);
        return unwrap(response);
    },
    async updateQuotation(id, data) {
        const response = await api.put(`/quotations/${id}`, data);
        return unwrap(response);
    },
    // Category Methods
    async fetchCategories() {
        const response = await api.get('/categories');
        return asArray(unwrap(response));
    },
    async addCategory(data) {
        const response = await api.post('/categories', data);
        return unwrap(response);
    },
    // Purchase Methods
    async fetchPurchases() {
        const response = await api.get('/purchases');
        return asArray(unwrap(response));
    },
    async addPurchase(data) {
        const response = await api.post('/purchases', data);
        return unwrap(response);
    },
    async receivePurchaseOrder(id, payload = {}) {
        const response = await api.patch(`/purchases/${id}/receive`, payload);
        return unwrap(response);
    },
    async updatePurchase(id, payload = {}) {
        const response = await api.patch(`/purchases/${id}`, payload);
        return unwrap(response);
    },
    async adjustInventoryStock(payload) {
        const response = await api.post('/inventory/adjust', payload);
        return unwrap(response);
    },
    async fetchInventoryAdjustments() {
        const response = await api.get('/inventory/adjustments');
        return asArray(unwrap(response));
    },
    async addInventoryItem(payload) {
        const response = await api.post('/inventory', payload);
        return unwrap(response);
    },
    async updateCustomer(payload) {
        if (!payload || !payload.id) throw new Error('Customer ID is required for update');
        const response = await api.post('/customers', payload);
        return unwrap(response);
    },
    async recordCustomerAdvance({ customerId, ...payload }) {
        if (!customerId) throw new Error('customerId is required to record an advance');
        const response = await api.post(`/customers/${customerId}/advance`, payload || {});
        return unwrap(response);
    },
    async syncAllCustomers() {
        const response = await api.post('/customers/sync-all');
        return unwrap(response);
    },
    async fetchFeatureToggles() {
        const response = await api.get('/admin/feature-toggles');
        return asArray(unwrap(response));
    },
    async updateFeatureToggle(key, payload = {}) {
        if (!key) throw new Error('Feature toggle key is required.');
        const response = await api.patch(`/admin/feature-toggles/${encodeURIComponent(key)}`, payload);
        return unwrap(response);
    },
    // WorkOrder service methods
    async createWorkOrder(quotationId) {
        const response = await api.post('/work-orders', { quotationId });
        return unwrap(response);
    },
    async fetchWorkOrders() {
        const response = await api.get('/work-orders');
        return asArray(unwrap(response));
    },
    async updateWorkOrder(id, payload) {
        const response = await api.put(`/work-orders/${id}`, payload || {});
        return unwrap(response);
    },
    async updateJobCard(data) {
        const response = await api.post('/job-cards', data);
        return unwrap(response);
    },
    async updateJobIntake(id, data) {
        // Typically we use POST /job-intakes for updates/upserts in this backend pattern
        const response = await api.post('/job-intakes', { ...data, id });
        return unwrap(response);
    },
    // Automotive Hub Methods
    async fetchCarInventory() {
        const response = await api.get('/automotive/car-inventory');
        return asArray(unwrap(response));
    },
    async addCarInventory(data) {
        const response = await api.post('/automotive/car-inventory', data);
        return unwrap(response);
    },
    async addCarRepair(id, data) {
        const response = await api.post(`/automotive/car-inventory/${id}/repair`, data);
        return unwrap(response);
    },
    async fetchCarSales() {
        const response = await api.get('/automotive/car-sales');
        return asArray(unwrap(response));
    },
    async addCarSale(data) {
        const response = await api.post('/automotive/car-sale', data);
        return unwrap(response);
    },
    // Vehicle Model Library
    async fetchVehicleModels() {
        const response = await api.get('/automotive/vehicle-models');
        return asArray(unwrap(response));
    },
    async addVehicleModel(brand, model) {
        const response = await api.post('/automotive/vehicle-models', { brand, model });
        return unwrap(response);
    },
    async correctTerm(text, context, targetLang, vehicleContext) {
        const response = await api.post('/ai/correct-term', { text, context, targetLang, vehicleContext });
        return unwrap(response);
    },
    async fetchRTVs() {
        const response = await api.get('/rtvs');
        return asArray(unwrap(response));
    },
    async createRTV(data) {
        const response = await api.post('/rtvs', data);
        return unwrap(response);
    },
    // Step 4: Rent-A-Car Module
    async fetchRentalCars() {
        const response = await api.get('/rentals/cars');
        return asArray(unwrap(response));
    },
    async addRentalCar(data) {
        const response = await api.post('/rentals/cars', data);
        return unwrap(response);
    },
    async fetchRentalTrips() {
        const response = await api.get('/rentals/trips');
        return asArray(unwrap(response));
    },
    async addRentalTrip(data) {
        const response = await api.post('/rentals/trips', data);
        return unwrap(response);
    },
    async endRentalTrip(id, data) {
        const response = await api.post(`/rentals/trips/${id}/end`, data);
        return unwrap(response);
    },

    // Step 4: Used Hub Module
    async fetchUsedItems() {
        const response = await api.get('/used-items');
        return asArray(unwrap(response));
    },
    async addUsedItem(data) {
        const response = await api.post('/used-items', data);
        return unwrap(response);
    },
    async sellUsedItem(id, data) {
        const response = await api.post(`/used-items/${id}/sell`, data);
        return unwrap(response);
    },
    async fetchVehicleHistory(regNo) {
        if (!regNo) return null;
        const response = await api.get(`/job-intakes/search/${encodeURIComponent(regNo)}`);
        return unwrap(response);
    },
    async fetchVehicleServiceSummary(regNo) {
        if (!regNo) return null;
        try {
            const response = await api.get(`/job-intakes/vehicle-summary/${encodeURIComponent(regNo)}`);
            return response.data?.summary || null;
        } catch (error) {
            console.error('API Sync Error (fetchVehicleServiceSummary):', error);
            return null;
        }
    }
};

export default databaseBridge;
